/** Require evidence on the first step of common factual basketball questions. */
export function needsLookup(text: string): boolean {
  // Keep refused topics on the normal text path; the system prompt handles them.
  if (/博彩|赌球|盘口|黑哨|假球|政治|隐私|绯闻|犯罪|法律指控/.test(text)) return false;
  return /赛程|赛果|比分|排名|场均|数据|统计|总冠军|夺冠|季后赛|总决赛|赛季|得分|篮板|助攻|命中率|连胜|连败|技术统计|复盘|比赛|战绩|冠军|新闻/.test(text);
}
