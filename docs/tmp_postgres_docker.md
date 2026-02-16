# 在自有服务器上用 Docker 部署 PostgreSQL（端口 9001，带数据卷，适配 Koyeb 访问）

本文是可直接执行的操作文档，目标是：

- 在你自己的公网服务器上运行 PostgreSQL（Docker）
- 使用本地目录作为持久化 volume
- 对外暴露非标准端口 `9001`
- 配置基础安全（强密码、最小权限、防火墙）
- 支持 Koyeb 服务连接

## 1. 前置假设

- 服务器系统：Ubuntu 22.04/24.04（其他 Linux 也可，命令略有差异）
- 你有 sudo 权限
- 服务器公网 IP：记为 `SERVER_PUBLIC_IP`
- 数据目录：`/opt/postgres/data`

注意：

- 非标准端口只能降低被扫到概率，不是安全边界。
- 真正安全依赖：防火墙白名单 + 强密码 + 最小权限 + 备份。

## 2. 安装 Docker 和 Compose 插件

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker
```

## 3. 准备目录和配置文件

```bash
sudo mkdir -p /opt/postgres/{data,conf}
sudo chown -R 999:999 /opt/postgres/data
sudo chmod 700 /opt/postgres/data
```

创建 `/opt/postgres/docker-compose.yml`：

```yaml
services:
  postgres:
    image: postgres:16
    container_name: pg9001
    restart: unless-stopped
    environment:
      POSTGRES_DB: appdb
      POSTGRES_USER: app_admin
      POSTGRES_PASSWORD: "PLEASE_CHANGE_TO_STRONG_PASSWORD"
      TZ: UTC
    command:
      - "postgres"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "password_encryption=scram-sha-256"
    ports:
      - "9001:5432"
    volumes:
      - /opt/postgres/data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app_admin -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 6
```

说明：

- `9001:5432` 表示宿主机 `9001` 映射到容器内 Postgres `5432`
- 数据持久化在 `/opt/postgres/data`
- `postgres:16` 是当前稳妥选择，先别用过新主版本做首发

## 4. 启动数据库

```bash
cd /opt/postgres
sudo docker compose up -d
sudo docker compose ps
sudo docker logs -f pg9001
```

看到 `database system is ready to accept connections` 即成功。

## 5. 创建业务专用用户（不要用超级用户给应用）

进入容器：

```bash
sudo docker exec -it pg9001 psql -U app_admin -d appdb
```

执行 SQL（示例）：

```sql
CREATE ROLE app_rw LOGIN PASSWORD 'CHANGE_ME_TO_ANOTHER_STRONG_PASSWORD';
GRANT CONNECT ON DATABASE appdb TO app_rw;

\c appdb
GRANT USAGE ON SCHEMA public TO app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
```

后续应用使用 `app_rw` 连接，不使用 `app_admin`。

## 6. 防火墙配置（UFW）

先默认拒绝，再只放行需要的端口：

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 22/tcp

# PostgreSQL 对外端口
sudo ufw allow 9001/tcp

sudo ufw enable
sudo ufw status verbose
```

如果你要做白名单（推荐），删除全放行规则，改成按源 IP 放行：

```bash
sudo ufw delete allow 9001/tcp
sudo ufw allow from <ALLOWED_IP_1> to any port 9001 proto tcp
sudo ufw allow from <ALLOWED_IP_2> to any port 9001 proto tcp
```

## 7. Koyeb 出口 IP 白名单说明（重点）

Koyeb 官方 FAQ 的结论是：

- 他们目前不提供“固定不变的静态出口 IP 列表”
- 可以通过 DNS 查询每个 region 的当前出口 IP 池
- 这些 IP 可能变动，需要周期性刷新白名单

可查询命令：

```bash
# 全局
dig +short outbound-ips.infra.prod.koyeb.com

# 按 region（例如 Washington）
dig +short outbound-ips-region-was.infra.prod.koyeb.com

# 例如 Frankfurt
dig +short outbound-ips-region-fra.infra.prod.koyeb.com
```

因此：

- 可以做白名单，但必须接受“动态更新”的运维成本
- 如果你服务固定部署在某个 Koyeb region，优先使用该 region 的 IP 池

## 8. 给应用使用的连接串

推荐给应用（Python/Node 通用）的连接串格式：

```text
postgresql://app_rw:<APP_RW_PASSWORD>@SERVER_PUBLIC_IP:9001/appdb?sslmode=require
```

如果你暂时不做 TLS 终止和证书配置，可先用：

```text
postgresql://app_rw:<APP_RW_PASSWORD>@SERVER_PUBLIC_IP:9001/appdb?sslmode=prefer
```

生产建议最终切到 `sslmode=require`（见第 10 节 TLS）。

## 9. 数据备份（最低要求）

创建备份目录并每天执行：

```bash
sudo mkdir -p /opt/postgres/backup
```

手动备份示例：

```bash
sudo docker exec pg9001 pg_dump -U app_admin -d appdb | gzip > /opt/postgres/backup/appdb_$(date +%F_%H%M%S).sql.gz
```

建议加 cron（每天 03:30）：

```bash
sudo crontab -e
```

加入：

```cron
30 3 * * * docker exec pg9001 pg_dump -U app_admin -d appdb | gzip > /opt/postgres/backup/appdb_$(date +\%F_\%H\%M\%S).sql.gz
```

并配合保留策略（例如只留 14 天）。

## 10. TLS 建议（可后补）

你当前方案是“直接暴露 9001，不走 Nginx”，可行。要增强安全可做两种方案：

- 方案 A：Postgres 原生 TLS（配置 `server.crt/server.key`）
- 方案 B：不公网暴露 9001，改用 WireGuard/Tailscale 内网访问

如果暂时不做 TLS，至少确保：

- 强密码（长度 >= 24，随机）
- 白名单严格
- 定期换密钥

## 11. 连通性验证

在任意客户端机器测试：

```bash
PGPASSWORD='<APP_RW_PASSWORD>' psql "host=SERVER_PUBLIC_IP port=9001 dbname=appdb user=app_rw sslmode=prefer" -c "select now();"
```

如果没有 `psql`：

- Python `psycopg` / Node `pg` 连接做 `SELECT 1` 即可。

## 12. 常见故障排查

- `connection refused`
  - 容器没启动、端口未映射、UFW 未放行
- `timeout`
  - 云厂商安全组没放行 9001，或 UFW 白名单不含来源 IP
- `password authentication failed`
  - 用户/密码错误，或应用还在用旧密码
- `no pg_hba.conf entry`
  - 通常是容器内认证策略改过，优先恢复官方镜像默认后再调

## 13. 推荐的最小生产配置清单

- Docker + Compose 管理容器
- `/opt/postgres/data` 本地持久卷
- 应用用户 `app_rw`（非超级用户）
- 端口 `9001` + 防火墙白名单
- 每日备份 + 定期恢复演练
- 每月例行更新镜像（小版本）

---

参考（官方）：

- Koyeb FAQ（出口 IP 说明）：`https://www.koyeb.com/docs/faqs/general`
