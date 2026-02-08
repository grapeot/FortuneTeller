# Bug Review Report

## Critical Issues

### 1. **App.jsx - Race Condition in startFortune**
**Location**: `src/App.jsx:48-79`
**Issue**: If user clicks rapidly, multiple `startFortune` calls can execute simultaneously. The phase check happens at the start, but during async operations, phase may change, leading to:
- Multiple API calls
- State inconsistencies
- Memory leaks

**Fix**: Add a ref to track if fortune telling is in progress:
```javascript
const isProcessingRef = useRef(false)

const startFortune = useCallback(async () => {
  if (phase !== PHASE.IDLE || isProcessingRef.current) return
  isProcessingRef.current = true
  
  try {
    // ... existing code
  } finally {
    isProcessingRef.current = false
  }
}, [phase])
```

### 2. **useFaceDetection - Error State Not Cleared**
**Location**: `src/hooks/useFaceDetection.js:23`
**Issue**: When `enabled` changes from `false` to `true` after an error, the error state persists and is displayed even though detection may succeed.

**Fix**: Clear error state when re-enabling:
```javascript
useEffect(() => {
  if (!enabled) {
    setError(null)
    return
  }
  // ... rest of code
}, [enabled, ...])
```

### 3. **useHolisticDetection - Global Function Collision**
**Location**: `src/hooks/useHolisticDetection.js:105`
**Issue**: Using `window.__drawHolisticSkeletons` global variable. If multiple instances exist (e.g., in tests or multiple components), they can overwrite each other.

**Fix**: Use a more unique key or ref-based approach:
```javascript
// Option 1: Use component instance ID
const instanceId = useRef(Math.random().toString(36))
window[`__drawHolisticSkeletons_${instanceId.current}`] = drawSkeletonsRef.current

// Option 2: Use a Map to store multiple instances
if (!window.__holisticDrawers) window.__holisticDrawers = new Map()
window.__holisticDrawers.set(instanceId.current, drawSkeletonsRef.current)
```

## Medium Priority Issues

### 4. **App.jsx - Missing Error Handling for captureAndAnnotate**
**Location**: `src/App.jsx:52`
**Issue**: If `captureAndAnnotate` fails, `originalImage` will be `null`, but there's no user feedback. The app continues silently.

**Fix**: Add error handling:
```javascript
const captureResult = await captureAndAnnotate(videoRef.current)
if (!captureResult) {
  // Show error message or retry
  console.error('Failed to capture face')
  return
}
```

### 5. **useFaceDetection - Unnecessary Re-initialization**
**Location**: `src/hooks/useFaceDetection.js:163`
**Issue**: `drawDetections` is in the dependency array. If `boxColor` or `lineWidth` change, the entire detection pipeline re-initializes, which is wasteful.

**Fix**: Separate drawing logic from detection logic, or use refs for colors:
```javascript
const boxColorRef = useRef(boxColor)
const lineWidthRef = useRef(lineWidth)

useEffect(() => {
  boxColorRef.current = boxColor
  lineWidthRef.current = lineWidth
}, [boxColor, lineWidth])

// Remove drawDetections from dependencies, use refs inside
```

### 6. **ResultOverlay - Cleanup Function Syntax**
**Location**: `src/components/ResultOverlay.jsx:54`
**Issue**: `return () => { cancelled = true }` - This works but is unusual. The `cancelled` variable is in the outer scope, so this is fine, but it's not immediately clear.

**Fix**: Make it more explicit:
```javascript
return () => {
  cancelled = true
}
```

### 7. **skeleton-drawer - Redundant Boundary Checks**
**Location**: `src/lib/skeleton-drawer.js:180-184`
**Issue**: Boundary checks happen both in the loop and in `drawConnection`. This is safe but redundant.

**Status**: Low priority - defensive programming is good, but could be optimized.

## Low Priority / Code Quality

### 8. **Debug Logs in Production Code**
**Location**: `src/hooks/useHolisticDetection.js:76-94, 108`
**Issue**: Console.log statements left in production code. Should use a debug flag or remove.

**Fix**: Wrap in development check:
```javascript
if (import.meta.env.DEV && Math.random() < 0.01) {
  console.log('Holistic detection result:', ...)
}
```

### 9. **Missing AbortController Cleanup**
**Location**: `src/lib/ai-fortune.js:116-117`
**Issue**: AbortController timeout is cleared in try/catch, but if function exits early, timeout might not be cleared. Actually, it is cleared in the catch block, so this is fine.

**Status**: Already handled correctly.

### 10. **Canvas Context Null Check Missing**
**Location**: `src/hooks/useFaceDetection.js:38`
**Issue**: `canvas.getContext('2d')` can return `null` in some environments (e.g., jsdom in tests), but there's no check.

**Fix**: Add null check:
```javascript
const ctx = canvas.getContext('2d')
if (!ctx) {
  console.warn('Canvas 2d context not available')
  return
}
```

## Summary

**Critical**: 3 issues
**Medium**: 4 issues  
**Low**: 3 issues

**Total**: 10 issues identified

Most critical issues are related to:
1. Race conditions in async operations
2. State management (error states not cleared)
3. Resource cleanup (global variables)

Recommend fixing critical and medium priority issues before production deployment.
