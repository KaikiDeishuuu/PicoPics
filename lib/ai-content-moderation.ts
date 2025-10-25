// Cloudflare Workers AI Content Moderation
// 使用 Cloudflare Workers AI 进行内容筛查

export interface ContentModerationResult {
  safe: boolean;
  categories: ContentCategory[];
  score: number;
  reason?: string;
}

export interface ContentCategory {
  name: string;
  score: number;
  description: string;
}

export interface ImageModerationResult extends ContentModerationResult {
  containsNudity: boolean;
  containsViolence: boolean;
  containsGraphic: boolean;
  containsOffensive: boolean;
}

/**
 * 使用 Cloudflare Workers AI 进行文本内容筛查
 * @param text 要筛查的文本内容
 * @param env 环境变量（包含 AI binding）
 * @returns 筛查结果
 */
export async function moderateTextContent(
  text: string,
  env: any
): Promise<ContentModerationResult> {
  try {
    if (!env.AI) {
      console.warn("AI binding not available, skipping moderation");
      return {
        safe: true,
        categories: [],
        score: 0,
      };
    }

    // 使用 Cloudflare Workers AI 的内容筛查模型
    const prompt = `Analyze the following text for inappropriate content. Respond with a JSON object containing:
- safe: boolean (whether the content is appropriate)
- categories: array of {name, score, description} (detected categories)
- overall_score: number (0-1, 0 is safe, 1 is most inappropriate)

Text to analyze: "${text.substring(0, 500)}"

Categories to check for: violence, hate_speech, nudity, spam, misinformation`;

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content:
            "You are a content moderation assistant. Analyze text for inappropriate content and return structured JSON responses.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });

    // 解析 AI 响应
    const result = parseAIResponse(response);

    return {
      safe: result.safe,
      categories: result.categories || [],
      score: result.score || 0,
      reason: result.reason,
    };
  } catch (error) {
    console.error("Content moderation error:", error);
    // 默认允许内容通过，避免误判
    return {
      safe: true,
      categories: [],
      score: 0,
      reason: "Moderation service unavailable",
    };
  }
}

/**
 * 使用 Cloudflare Workers AI 进行图片内容筛查
 * @param imageData 图片的 Base64 编码数据或 ArrayBuffer
 * @param env 环境变量（包含 AI binding）
 * @returns 筛查结果
 */
export async function moderateImageContent(
  imageData: string | ArrayBuffer,
  env: any
): Promise<ImageModerationResult> {
  try {
    if (!env.AI) {
      console.warn("AI binding not available, skipping image moderation");
      return {
        safe: true,
        categories: [],
        score: 0,
        containsNudity: false,
        containsViolence: false,
        containsGraphic: false,
        containsOffensive: false,
      };
    }

    // 准备图片数据
    let imageBuffer: ArrayBuffer;
    if (typeof imageData === "string") {
      imageBuffer = base64ToArrayBuffer(imageData);
    } else {
      imageBuffer = imageData;
    }

    // 使用 Cloudflare Workers AI 的图片内容筛查
    const inputs = {
      image: imageBuffer,
      prompt:
        "Analyze this image for inappropriate content including nudity, violence, graphic content, and offensive material. Respond with JSON containing safety assessment.",
    };

    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-vision", inputs);

    // 解析响应
    const result = parseAIVisionResponse(response);

    return {
      safe: result.safe,
      categories: result.categories || [],
      score: result.score || 0,
      reason: result.reason,
      containsNudity: result.containsNudity || false,
      containsViolence: result.containsViolence || false,
      containsGraphic: result.containsGraphic || false,
      containsOffensive: result.containsOffensive || false,
    };
  } catch (error) {
    console.error("Image moderation error:", error);
    return {
      safe: true,
      categories: [],
      score: 0,
      containsNudity: false,
      containsViolence: false,
      containsGraphic: false,
      containsOffensive: false,
      reason: "Moderation service unavailable",
    };
  }
}

/**
 * 解析 AI 文本响应
 */
function parseAIResponse(response: any): any {
  try {
    // 尝试从响应中提取 JSON
    const text = typeof response === "string" ? response : JSON.stringify(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // 如果无法解析，返回默认安全结果
    return {
      safe: true,
      categories: [],
      score: 0,
    };
  } catch (error) {
    console.error("Failed to parse AI response:", error);
    return {
      safe: true,
      categories: [],
      score: 0,
    };
  }
}

/**
 * 解析 AI 视觉响应
 */
function parseAIVisionResponse(response: any): any {
  try {
    const text = typeof response === "string" ? response : JSON.stringify(response);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        safe: parsed.safe !== false,
        categories: parsed.categories || [],
        score: parsed.overall_score || 0,
        containsNudity: parsed.containsNudity || false,
        containsViolence: parsed.containsViolence || false,
        containsGraphic: parsed.containsGraphic || false,
        containsOffensive: parsed.containsOffensive || false,
      };
    }

    return {
      safe: true,
      categories: [],
      score: 0,
      containsNudity: false,
      containsViolence: false,
      containsGraphic: false,
      containsOffensive: false,
    };
  } catch (error) {
    console.error("Failed to parse AI vision response:", error);
    return {
      safe: true,
      categories: [],
      score: 0,
      containsNudity: false,
      containsViolence: false,
      containsGraphic: false,
      containsOffensive: false,
    };
  }
}

/**
 * 将 Base64 字符串转换为 ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64.split(",")[1] || base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 简化的内容筛查（无需 AI，基于关键词）
 */
export function simpleContentModeration(text: string): ContentModerationResult {
  // 定义敏感关键词（示例）
  const sensitiveKeywords = [
    // 暴力
    "kill",
    "murder",
    "violence",
    "attack",
    // 仇恨言论
    "hate",
    "racism",
    "discrimination",
    // 色情
    "porn",
    "sex",
    "nude",
    "naked",
  ];

  const lowerText = text.toLowerCase();
  let score = 0;
  const categories: ContentCategory[] = [];

  // 检查关键词
  for (const keyword of sensitiveKeywords) {
    if (lowerText.includes(keyword)) {
      score += 0.1;
      categories.push({
        name: "sensitive_content",
        score: 0.5,
        description: `Contains potentially sensitive keyword: ${keyword}`,
      });
    }
  }

  // 计算最终得分
  const finalScore = Math.min(score, 1);

  return {
    safe: finalScore < 0.5,
    categories,
    score: finalScore,
    reason: score > 0 ? "Contains potentially sensitive content" : undefined,
  };
}
