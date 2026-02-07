#!/usr/bin/env python3
"""
性能分析脚本：重现整个相面流程并分析性能瓶颈

流程：
1. 加载测试图片
2. 图像处理（模拟MediaPipe处理）
3. 调用LLM API
4. 分析各步骤耗时
"""

import asyncio
import base64
import json
import os
import time
from pathlib import Path
from typing import Dict, Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

# 配置
AI_API_BASE = os.getenv("AI_API_BASE_URL", "https://space.ai-builders.com/backend/v1")
AI_TOKEN = os.getenv("AI_BUILDER_TOKEN") or os.getenv("VITE_AI_API_TOKEN", "")
TEST_IMAGE_PATH = Path(__file__).parent.parent / "test-assets" / "test-face-1.jpg"

# 简化的系统prompt（用于测试）
SYSTEM_PROMPT = """你是一位精通中国传统面相学的相面先生。此刻正值2026年丙午马年新春，你在庙会上为来客看相。你会收到来访者的面部照片以及面部测量数据。请根据你实际观察到的面部特征，给出专业、具体的面相分析。

严格用JSON格式返回，不要markdown代码块：
{"face": "面相观察——", "career": "事业建议。", "blessing": "新春祝语！"}"""


class Profiler:
    """性能分析器"""
    
    def __init__(self):
        self.timings: Dict[str, float] = {}
        self.start_time: Optional[float] = None
        
    def start(self):
        """开始计时"""
        self.start_time = time.time()
        
    def mark(self, name: str):
        """标记一个时间点"""
        if self.start_time is None:
            self.start_time = time.time()
        elapsed = time.time() - self.start_time
        self.timings[name] = elapsed
        print(f"⏱️  {name}: {elapsed:.3f}s")
        
    def get_report(self) -> str:
        """生成报告"""
        if not self.timings:
            return "无计时数据"
        
        report = ["\n" + "="*60]
        report.append("性能分析报告")
        report.append("="*60 + "\n")
        
        prev_time = 0
        for name, elapsed in self.timings.items():
            step_time = elapsed - prev_time
            percentage = (step_time / elapsed * 100) if elapsed > 0 else 0
            report.append(f"{name:30s} {step_time:8.3f}s ({percentage:5.1f}%)")
            prev_time = elapsed
        
        total = max(self.timings.values()) if self.timings else 0
        report.append("-" * 60)
        report.append(f"{'总计':30s} {total:8.3f}s")
        report.append("="*60 + "\n")
        
        return "\n".join(report)


async def load_test_image() -> tuple[str, float]:
    """加载测试图片并转换为base64"""
    start = time.time()
    
    if not TEST_IMAGE_PATH.exists():
        # 创建一个简单的测试图片（1x1像素）
        from PIL import Image
        img = Image.new('RGB', (640, 480), color='gray')
        img.save(TEST_IMAGE_PATH, 'JPEG')
        print(f"⚠️  创建了测试图片: {TEST_IMAGE_PATH}")
    
    with open(TEST_IMAGE_PATH, 'rb') as f:
        image_bytes = f.read()
    
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    data_url = f"data:image/jpeg;base64,{image_b64}"
    
    elapsed = time.time() - start
    return data_url, elapsed


async def simulate_image_processing(image_data_url: str) -> tuple[dict, float]:
    """模拟图像处理（MediaPipe面部检测和标注）"""
    start = time.time()
    
    # 模拟处理时间（实际MediaPipe处理通常在100-300ms）
    await asyncio.sleep(0.2)
    
    # 模拟测量数据
    measurements = {
        "三停比例": {"上停": 0.33, "中停": 0.34, "下停": 0.33},
        "脸型": "椭圆形",
        "五官特征": "标准",
    }
    
    elapsed = time.time() - start
    return measurements, elapsed


async def call_llm_api(image_data_url: str, measurements: dict) -> tuple[dict, float]:
    """调用LLM API"""
    start = time.time()
    
    if not AI_TOKEN:
        raise ValueError("AI_BUILDER_TOKEN 未配置")
    
    user_content = [
        {
            "type": "image_url",
            "image_url": {"url": image_data_url},
        },
        {
            "type": "text",
            "text": f"请仔细观察这位贵客的面相。\n\n测量数据：{json.dumps(measurements, ensure_ascii=False)}\n\n请根据你的面相学知识和实际观察给出具体的论断。",
        },
    ]
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{AI_API_BASE}/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {AI_TOKEN}",
            },
            json={
                "model": "grok-4-fast",  # 使用grok模型
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 1.0,
                "max_tokens": 1200,
            },
        )
        resp.raise_for_status()
        
        data = resp.json()
        text = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
        
        # 解析JSON响应
        json_str = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(json_str)
    
    elapsed = time.time() - start
    return result, elapsed


async def main():
    """主流程"""
    profiler = Profiler()
    profiler.start()
    
    print("🚀 开始性能分析...\n")
    
    try:
        # 步骤1: 加载图片
        print("📸 步骤1: 加载测试图片...")
        image_data_url, load_time = await load_test_image()
        profiler.mark(f"1. 加载图片 ({load_time*1000:.0f}ms)")
        
        # 步骤2: 图像处理
        print("\n🖼️  步骤2: 图像处理（模拟MediaPipe）...")
        measurements, process_time = await simulate_image_processing(image_data_url)
        profiler.mark(f"2. 图像处理 ({process_time*1000:.0f}ms)")
        
        # 步骤3: 调用LLM API
        print("\n🤖 步骤3: 调用LLM API...")
        result, api_time = await call_llm_api(image_data_url, measurements)
        profiler.mark(f"3. LLM API调用 ({api_time*1000:.0f}ms)")
        
        # 步骤4: 结果处理
        print("\n✅ 步骤4: 结果处理...")
        await asyncio.sleep(0.01)  # 模拟结果处理时间
        profiler.mark("4. 结果处理")
        
        # 输出结果
        print("\n" + "="*60)
        print("相面结果:")
        print("="*60)
        print(f"面相: {result.get('face', 'N/A')}")
        print(f"事业: {result.get('career', 'N/A')}")
        print(f"祝语: {result.get('blessing', 'N/A')}")
        
        # 生成报告
        print(profiler.get_report())
        
        # 性能分析
        print("\n📊 性能分析:")
        print("-" * 60)
        total_time = max(profiler.timings.values())
        
        if api_time > total_time * 0.7:
            print("⚠️  瓶颈: LLM API调用占用了大部分时间")
            print("   建议: 考虑使用更快的模型或优化prompt")
        elif process_time > total_time * 0.3:
            print("⚠️  瓶颈: 图像处理占用了较多时间")
            print("   建议: 检查MediaPipe配置或使用更快的检测模型")
        else:
            print("✅ 各步骤时间分配较为均衡")
        
        print(f"\n总耗时: {total_time:.3f}s")
        if total_time > 5:
            print("⚠️  总耗时较长，建议优化")
        elif total_time > 3:
            print("ℹ️  总耗时适中")
        else:
            print("✅ 总耗时较短")
            
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        profiler.mark("错误发生")
        print(profiler.get_report())


if __name__ == "__main__":
    asyncio.run(main())
