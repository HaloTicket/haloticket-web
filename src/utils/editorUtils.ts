/**
 * Default sample description template for event creation
 */
export const DEFAULT_DESCRIPTION_TEMPLATE = `Giới thiệu sự kiện:
[Tóm tắt ngắn gọn về sự kiện: Nội dung chính của sự kiện, điểm đặc sắc nhất và lý do khiến người tham gia không nên bỏ lỡ]

Chi tiết sự kiện:
• Chương trình chính: [Liệt kê những hoạt động nổi bật trong sự kiện: các phần trình diễn, khách mời đặc biệt, lịch trình các tiết mục cụ thể nếu có.]
• Khách mời: [Thông tin về các khách mời đặc biệt, nghệ sĩ, diễn giả sẽ tham gia sự kiện. Có thể bao gồm phần mô tả ngắn gọn về họ và những gì họ sẽ mang lại cho sự kiện.]
• Trải nghiệm đặc biệt: [Nếu có các hoạt động đặc biệt khác như workshop, khu trải nghiệm, photo booth, khu vực check-in hay các phần quà/ưu đãi dành riêng cho người tham dự.]

Điều khoản và điều kiện:
[TnC] sự kiện
Lưu ý về điều khoản trẻ em
Lưu ý về điều khoản VAT`;

/**
 * Options for inserting image into editor
 */
export interface ImageEmbedOptions {
  source: string;
  alt?: string;
  width?: string;
  height?: string;
}

/**
 * Builds HTML image tag with optional dimensions and alt text
 */
export const buildImageMarkup = (options: ImageEmbedOptions): string => {
  const { source, alt = "", width, height } = options;
  if (!source || !source.trim()) return "";
  const src = source.trim();
  const altAttr = alt ? ` alt="${alt.replace(/"/g, "&quot;")}"` : "";
  const widthAttr = width ? ` width="${width}"` : "";
  const heightAttr = height ? ` height="${height}"` : "";
  const styleAttr = (width || height)
    ? ` style="${width ? `width: ${width}px;` : ""}${height ? ` height: ${height}px;` : ""}"`
    : "";

  return `\n<img src="${src}"${altAttr}${widthAttr}${heightAttr}${styleAttr} class="rounded-xl max-w-full my-3" />\n`;
};

/**
 * Options for inserting media/video into editor
 */
export interface MediaEmbedOptions {
  source: string;
  width?: string;
  height?: string;
  altSource?: string;
  poster?: string;
}

/**
 * Builds HTML embed markup for YouTube or MP4/HTML5 video URL with width, height, poster, alt source
 */
export const buildMediaEmbedMarkup = (options: MediaEmbedOptions): string => {
  const { source, width, height, altSource, poster } = options;
  if (!source || !source.trim()) return "";
  let url = source.trim();

  const widthStyle = width ? `${width}px` : "100%";
  const heightStyle = height ? `${height}px` : "400px";

  if (url.includes("youtube.com/watch?v=")) {
    const vId = url.split("v=")[1]?.split("&")[0];
    if (vId) url = `https://www.youtube.com/embed/${vId}`;
  } else if (url.includes("youtu.be/")) {
    const vId = url.split("youtu.be/")[1]?.split("?")[0];
    if (vId) url = `https://www.youtube.com/embed/${vId}`;
  }

  if (url.includes("youtube.com/embed/")) {
    return `\n<iframe src="${url}" width="${width || "100%"}" height="${height || "400"}" style="width: ${widthStyle}; height: ${heightStyle}; max-width: 100%;" frameborder="0" allowfullscreen class="rounded-xl my-3"></iframe>\n`;
  }

  const posterAttr = poster ? ` poster="${poster}"` : "";
  const altSourceTag = altSource ? `<source src="${altSource}" />` : "";
  return `\n<video controls${posterAttr} width="${width || "100%"}" height="${height || "400"}" style="width: ${widthStyle}; height: ${heightStyle}; max-width: 100%;" class="rounded-xl my-3">\n  <source src="${url}" />\n  ${altSourceTag}\n  Trình duyệt của bạn không hỗ trợ thẻ video.\n</video>\n`;
};

/**
 * Builds HTML embed markup for YouTube or MP4 video URL (legacy fallback helper)
 */
export const buildVideoEmbedMarkup = (rawUrl: string): string => {
  return buildMediaEmbedMarkup({ source: rawUrl });
};

/**
 * Applies text formatting (Bold, Italic, Underline, Color, Heading, Alignment) to an HTML TextArea element
 */
export const applyTextFormatToTextarea = (
  textareaId: string,
  currentText: string,
  prefix: string,
  suffix: string = prefix
): string => {
  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
  if (!textarea) return currentText;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = currentText.substring(start, end);
  const replacement = selectedText
    ? `${prefix}${selectedText}${suffix}`
    : `${prefix}Văn bản mẫu${suffix}`;

  return currentText.substring(0, start) + replacement + currentText.substring(end);
};

