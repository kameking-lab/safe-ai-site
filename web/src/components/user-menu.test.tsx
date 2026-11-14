import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserMenu, UserMenuSessionProvider } from "./user-menu";
const logout=vi.hoisted(()=>vi.fn());
vi.mock('next-auth/react',()=>({signOut:logout}));

describe("UserMenu session boundary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();logout.mockReset();
  });

  it('starts the membership fetch before load and idle callbacks',()=>{
    vi.spyOn(document,'readyState','get').mockReturnValue('loading');
    const fetch=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',fetch);
    render(<UserMenuSessionProvider enabled><UserMenu/></UserMenuSessionProvider>);
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('acknowledges logout immediately while the server is pending and restores on failure',async()=>{
    let reject!:(error:Error)=>void;logout.mockImplementation(()=>new Promise((_,r)=>{reject=r;}));
    render(<UserMenu user={{name:'fixture member'}}/>);
    fireEvent.click(screen.getByRole('button',{name:'fixture member'}));
    fireEvent.click(screen.getByRole('menuitem',{name:'ログアウト'}));
    expect(screen.getByRole('button',{name:'ログアウト中…'}).getAttribute('aria-busy')).toBe('true');
    await act(async()=>reject(new Error('offline')));
    expect(screen.getByRole('alert').textContent).toContain('ログアウトできませんでした');
    expect(screen.getByRole('button',{name:'fixture member'})).toBeTruthy();
  });

  it("明示ゲストではsession APIへ接続しない", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<UserMenu user={null} />);

    expect(screen.getByRole("link", { name: /ログイン/ })).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("desktop/mobileの2メニューでもsession取得はAppShell単位で1回だけ", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          name: "安全担当",
          email: "safety@example.test",
          image: null,
          planName: "internal-value",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <UserMenuSessionProvider enabled>
        <UserMenu />
        <UserMenu />
      </UserMenuSessionProvider>,
    );
    window.dispatchEvent(new Event("load"));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /安全担当/ })).toHaveLength(2);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/profile",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(document.body.textContent).not.toContain("internal-value");
  });

  it("Previewまたは認証未構成では2メニューでもsession取得0回", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <UserMenuSessionProvider enabled={false}>
        <UserMenu />
        <UserMenu />
      </UserMenuSessionProvider>,
    );
    window.dispatchEvent(new Event("load"));

    expect(screen.getAllByRole("link", { name: /ログイン/ })).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("遮断・一時障害・不正応答ではゲスト表示を維持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    render(
      <UserMenuSessionProvider enabled>
        <UserMenu />
      </UserMenuSessionProvider>,
    );
    window.dispatchEvent(new Event("load"));

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /ログイン/ })).toBeDefined(),
    );
  });
});
