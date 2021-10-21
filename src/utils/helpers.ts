export const findStatus = (publishedVersion: number, version: number) => {
  if (!publishedVersion) return "draft"
  if (!!publishedVersion && version >= publishedVersion + 2) {
    return "changed"
  }
  if (!!publishedVersion && version >= publishedVersion + 1) {
    return "published"
  }
  return "archived"
}
