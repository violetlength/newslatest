// URL转换功能测试
import { transformApiUrl, shouldUseDirectApi } from '../config/api';

// 测试用例
const testCases = [
  {
    name: '掘金API转换',
    input: 'https://newslatest-ten.vercel.app/api/juejin/content_api/v1/content/article_rank?category_id=1&type=hot',
    expected: 'https://api.juejin.cn/content_api/v1/content/article_rank?category_id=1&type=hot'
  },
  {
    name: '哔哩哔哩API转换',
    input: 'https://newslatest-ten.vercel.app/api/bilibili/x/web-interface/ranking/v2?rid=0',
    expected: 'https://api.bilibili.com/x/web-interface/ranking/v2?rid=0'
  },
  {
    name: '微博API转换',
    input: 'https://newslatest-ten.vercel.app/api/weibo/ajax/side/hotSearch',
    expected: 'https://weibo.com/ajax/side/hotSearch'
  },
  {
    name: '非API路径不转换',
    input: 'https://newslatest-ten.vercel.app/home',
    expected: 'https://newslatest-ten.vercel.app/home'
  },
  {
    name: '不支持的API不转换',
    input: 'https://newslatest-ten.vercel.app/api/unknown/some/path',
    expected: 'https://newslatest-ten.vercel.app/api/unknown/some/path'
  }
];

// 运行测试
export function runUrlTransformTests(): void {
  console.log('=== URL转换功能测试 ===');
  console.log(`环境: ${import.meta.env.MODE}`);
  console.log(`是否使用直接API: ${shouldUseDirectApi()}`);
  console.log('');

  testCases.forEach((testCase) => {
    const result = transformApiUrl(testCase.input);
    const passed = result === testCase.expected;
    
    console.log(`测试: ${testCase.name}`);
    console.log(`输入: ${testCase.input}`);
    console.log(`期望: ${testCase.expected}`);
    console.log(`结果: ${result}`);
    console.log(`状态: ${passed ? '✅ 通过' : '❌ 失败'}`);
    console.log('');
  });
}

// 在开发环境中自动运行测试
if (import.meta.env.DEV) {
  runUrlTransformTests();
}
