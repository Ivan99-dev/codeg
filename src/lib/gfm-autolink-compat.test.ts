import type { Link, Root } from "mdast"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import { visit } from "unist-util-visit"
import { describe, expect, it } from "vitest"

function parseLinks(markdown: string) {
  const processor = unified().use(remarkParse).use(remarkGfm)
  const tree = processor.runSync(processor.parse(markdown)) as Root
  const links: Link[] = []

  visit(tree, "link", (node) => links.push(node))
  return links
}

describe("GFM email autolinks", () => {
  it("links an email at the start of the text", () => {
    const [link] = parseLinks("ios@example.com is reachable")

    expect(link?.url).toBe("mailto:ios@example.com")
    expect(link?.children[0]).toMatchObject({
      type: "text",
      value: "ios@example.com",
    })
  })

  it("links an email after punctuation without consuming the boundary", () => {
    const [link] = parseLinks("Contact (team+ios@example.com).")

    expect(link?.url).toBe("mailto:team+ios@example.com")
    expect(link?.position?.start.column).toBe(10)
  })

  it("does not link an email candidate immediately after a slash", () => {
    expect(parseLinks("account/user@example.com")).toHaveLength(0)
  })
})
