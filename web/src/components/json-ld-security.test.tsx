import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JsonLd, serializeJsonLd } from "./json-ld";

describe("JSON-LD script serialization", () => {
  const hostile = "</script><img src=x onerror=alert(1)>&\u2028";

  it("script終了タグとHTML-significant文字をliteralで出力しない", () => {
    const serialized = serializeJsonLd({ name: hostile });
    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<img");
    expect(serialized).not.toContain("&");
    expect(JSON.parse(serialized)).toEqual({ name: hostile });
  });

  it("JsonLdコンポーネントも安全なserializerだけを使う", () => {
    const { container } = render(<JsonLd schema={{ "@type": "Thing", name: hostile }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(script!.innerHTML).not.toContain("</script>");
    expect(JSON.parse(script!.textContent ?? "")).toMatchObject({ name: hostile });
  });
});
