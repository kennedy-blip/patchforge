"use client";
import { client } from "../lib/browser";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import {
  Layers3,
  Boxes,
  PanelLeft,
  Download,
  Monitor,
  ChevronDown,
  FolderOpen,
  UploadCloud,
  Calculator,
  Notebook,
  Clock,
  ShieldCheck,
  SlidersHorizontal,
  Terminal,
  Copy,
  Box,
  Play,
  FileCode2,
  Fingerprint,
  Palette,
  Braces,
  Check,
  ArrowUpRight,
  SquareTerminal,
  Activity,
  X,
  User,
  CheckCircle2,
  Package,
  ChevronRight,
  Sun,
} from "lucide-react";
const samples = ["Simple Calculator", "Simple Notes"];
const files = ["simple-calculator.apk", "simple-notes.apk"];
const tabs = ["Identity", "Manifest", "Resources", "Recipe"];
const stages = [
  "Queued",
  "Decompiling",
  "Applying patches",
  "Rebuilding",
  "Signing",
  "Ready",
];
function save(obj: unknown) {
  let u = URL.createObjectURL(
    new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }),
  );
  let a = document.createElement("a");
  a.href = u;
  a.download = "patch-recipe.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}
export default function Home() {
  const [i, I] = useState(0),
    [tab, T] = useState(0),
    [label, L] = useState(samples[0]),
    [suffix, S] = useState(".custom"),
    [theme, H] = useState("dark"),
    [modal, M] = useState(""),
    [side, Q] = useState(true),
    [mobile, B] = useState(1),
    [step, P] = useState(-1),
    [hist, G] = useState<string[]>([]),
    [flags, F] = useState([false, false, false]),
    [color, C] = useState("#10b981"),
    [msg, A] = useState(""),
    [att, V] = useState(false),
    [custom, U] = useState("");
  const [token, K] = useState(""),
    [email, E] = useState(""),
    [source, J] = useState(""),
    [cloudId, D] = useState(""),
    [artifact, R] = useState<{
      download?: string;
      bytes: number;
      sha256: string;
    } | null>(null);
  useEffect(() => {
    const sub = client?.auth.onAuthStateChange((_event, session) =>
      K(session?.access_token || ""),
    );
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!cloudId) return;
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch("/api/builds/" + cloudId, {
          headers: { Authorization: "Bearer " + token },
        });
        if (!res.ok) throw Error("Build status unavailable");
        const row = await res.json();
        if (stopped) return;
        if (row.status === "Ready") {
          R(row);
          P(5);
          D("");
        }
        if (row.status === "Failed") throw Error("Cloud build failed");
      } catch (e) {
        if (!stopped) {
          A((e as Error).message);
          M("Build status");
          P(-1);
          D("");
        }
      }
    }
    let timer = setInterval(poll, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [cloudId, token]);
  async function run() {
    if (!source) {
      P(0);
      B(2);
      return;
    }
    try {
      const res = await fetch("/api/builds/trigger", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ input: source, authorized: att, recipe }),
      });
      let row = await res.json();
      if (!res.ok) throw Error(row.error);
      D(row.id);
      P(0);
      B(2);
    } catch (e) {
      A((e as Error).message);
      M("Build status");
    }
  }
  let file = custom || files[i],
    pkg = "org.simplemobiletools." + (i ? "notes" : "calculator"),
    recipe = {
      app_name: label,
      package_suffix: suffix,
      colorPrimary: color,
      ...Object.fromEntries(
        ["debuggable", "usesCleartextTraffic", "allowBackup"].map((k, j) => [
          k,
          flags[j],
        ]),
      ),
    };
  useEffect(() => {
    H(localStorage.theme || "dark");
    try {
      G(JSON.parse(localStorage.historyPF || "[]"));
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (step >= 0 && step < 5 && !source) {
      let t = setTimeout(() => P(step + 1), 700);
      return () => clearTimeout(t);
    }
    if (step === 5) {
      let h = [label + (source ? " · cloud" : " · demo"), ...hist].slice(0, 8);
      G(h);
      localStorage.historyPF = JSON.stringify(h);
    }
  }, [step]);
  function sample(n: number) {
    J("");
    R(null);
    I(n);
    U("");
    L(samples[n]);
    P(-1);
    B(1);
  }
  let logs = [
    "Workspace initialized",
    "Demo runner connected",
    `Loaded ${file}`,
    "Manifest inspection complete",
    "Ready for configuration",
    ...stages
      .slice(0, step + 1)
      .map((x) => (source ? "Worker: " : "Demo: ") + x),
  ];
  async function intake(f?: File) {
    if (!f) return;
    if (!att) {
      A("Confirm authorized use first.");
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      A("Maximum size is 100 MB.");
      return;
    }
    if (client) {
      if (!token) {
        M("Guest session");
        return;
      }
      let { data } = await client.auth.getUser();
      if (!data.user) return;
      let id = crypto.randomUUID();
      let { error } = await client.storage
        .from("raw-apks")
        .upload(data.user.id + "/" + id + ".apk", f);
      if (error) {
        A(error.message);
        return;
      }
      J(id);
    } else {
      let res = await fetch("/api/inspect", {
        method: "POST",
        body: f,
        headers: { "x-authorized-use": "yes" },
      });
      let d = await res.json();
      if (!res.ok) {
        A(d.error);
        return;
      }
    }
    R(null);
    U(f.name);
    L(f.name.replace(/\.apk$/i, ""));
    P(-1);
    M("");
    B(1);
  }
  return (
    <>
      <header>
        <div className="brand">
          <span className="logo">
            <Layers3 />
          </span>
          PatchForge <em>Studio</em>
        </div>
        <span className="v">v1.0</span>
        <div className="grow" />
        <button
          className="theme"
          title="Change appearance"
          onClick={() =>
            H(
              theme === "dark"
                ? "light"
                : theme === "light"
                  ? "terminal"
                  : "dark",
            )
          }
        >
          <Monitor size={16} />
          <ChevronDown size={12} />
        </button>
        <button
          className="download"
          onClick={() =>
            process.env.NEXT_PUBLIC_STUDIO_APK_URL
              ? window.location.assign(process.env.NEXT_PUBLIC_STUDIO_APK_URL)
              : M("Download app")
          }
        >
          <Download size={15} /> Download App <small>.apk</small>
        </button>
        <button className="avatar" onClick={() => M("Guest session")}>
          G
        </button>
      </header>
      <div className={"layout " + (!side ? "collapsed" : "")}>
        <aside className={mobile === 0 ? "show" : ""}>
          <div className="cap">
            <FolderOpen /> EXPLORER{" "}
            <button title="Collapse explorer" onClick={() => Q(false)}>
              <PanelLeft />
            </button>
          </div>
          <div className="leftpad">
            <div className="eyebrow">APK INTAKE</div>
            <button
              className="drop"
              onClick={() => {
                M("Upload APK");
                A("");
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                M("Upload APK");
                A("Confirm ownership, then select your package.");
              }}
            >
              <UploadCloud />
              <strong>Upload APK</strong>
              <span>
                Drop file or <b>browse</b>
              </span>
              <small>.apk · max 100 MB</small>
            </button>
            <div className="eyebrow">
              SAMPLE LIBRARY <small>02</small>
            </div>
            {samples.map((s, n) => {
              let Icon = n ? Notebook : Calculator;
              return (
                <button
                  key={s}
                  className={"sample " + (!custom && i === n ? "active" : "")}
                  onClick={() => sample(n)}
                >
                  <i>
                    <Icon />
                  </i>
                  <span>
                    {s}
                    <small>Open-source sample</small>
                  </span>
                  {i === n && !custom && <b>•</b>}
                </button>
              );
            })}
            <hr />
            <div className="eyebrow">
              BUILD HISTORY <Clock size={13} />
            </div>
            {hist.length ? (
              hist.map((x, j) => <p key={j}>{x}</p>)
            ) : (
              <p>No builds this session</p>
            )}
          </div>
          <div className="guest">
            <User size={17} />
            <span>
              {token ? "Builder workspace" : "Guest workspace"}
              <small>
                {token ? "Authenticated session" : "Local demo session"}
              </small>
            </span>
          </div>
        </aside>
        <main className={mobile === 1 ? "show" : ""}>
          <div className="crumb">
            <button title="Toggle explorer" onClick={() => Q(!side)}>
              <PanelLeft size={15} />
            </button>{" "}
            Workspace <ChevronRight size={12} /> <b>Patch studio</b>
          </div>
          <div className="over">
            <span /> WORKSPACE / 01
          </div>
          <div className="title">
            <h1>Patch studio</h1>
            <button
              className="primary"
              disabled={
                (step >= 0 && step < 5) ||
                !label ||
                !/^([.][a-z][a-z0-9_]*)*$/.test(suffix)
              }
              onClick={run}
            >
              <Play size={15} fill="currentColor" /> Run build
            </button>
          </div>
          <p className="subtitle">
            Inspect, customize, and rebuild your Android package.
          </p>
          <section className="hero">
            <div>
              <div className="over">SOURCE PACKAGE</div>
              <h2>{custom || samples[i]}</h2>
              <code>{custom ? "Local package" : pkg}</code>
              <div className="badges">
                <small>APK</small>
                <small>{custom ? "Local" : "v5.12.0"}</small>
                <small>{custom ? "Inspected" : "Open source"}</small>
              </div>
            </div>
            <img src="/package.svg" alt="Exploded Android package diagram" />
          </section>
          <section className="card config">
            <div className="bar">
              <SlidersHorizontal />
              Patch configurator
            </div>
            <div className="tabs">
              {tabs.map((s, n) => {
                let Ic = [Fingerprint, FileCode2, Palette, Braces][n];
                return (
                  <button
                    key={s}
                    className={n === tab ? "sel" : ""}
                    onClick={() => T(n)}
                  >
                    <Ic />
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="fields">
              {tab === 0 ? (
                <>
                  <h3>App identity</h3>
                  <p>Customize the display name and package identifier.</p>
                  <label>
                    Application label
                    <input
                      value={label}
                      onChange={(e) => L(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <label>
                    Package suffix
                    <input value={suffix} onChange={(e) => S(e.target.value)} />
                  </label>
                  <small>
                    Resolved ID:{" "}
                    <code>
                      {custom ? "(source package)" : pkg}
                      {suffix}
                    </code>
                  </small>
                </>
              ) : tab === 1 ? (
                <>
                  <h3>Manifest flags</h3>
                  <p>Set explicit application behavior flags in your recipe.</p>
                  {[
                    "Debuggable",
                    "Allow cleartext traffic",
                    "Allow backup",
                  ].map((s, j) => (
                    <label key={s}>
                      <input
                        type="checkbox"
                        checked={flags[j]}
                        onChange={() =>
                          F(flags.map((v, k) => (k === j ? !v : v)))
                        }
                      />
                      {s}
                    </label>
                  ))}
                </>
              ) : tab === 2 ? (
                <>
                  <h3>Theme resources</h3>
                  <label>
                    Primary color
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => C(e.target.value)}
                    />
                  </label>
                  <code>{color}</code>
                </>
              ) : (
                <>
                  <h3>Patch recipe</h3>
                  <pre>{JSON.stringify(recipe, null, 2)}</pre>
                  <button onClick={() => save(recipe)}>Export JSON</button>
                </>
              )}
            </div>
          </section>
          <section className="card">
            <div className="bar">
              <FileCode2 />
              Diff preview <small>strings.xml</small>
            </div>
            <div className="diff">
              −　{`<string name="app_name">${custom || samples[i]}</string>`}
            </div>
            <div className="diff plus">
              +　{`<string name="app_name">${label}</string>`}
            </div>
          </section>
        </main>
        <article className={mobile === 2 ? "show" : ""}>
          <div className="cap">
            <Activity /> BUILD MONITOR <b className="dot">● ONLINE</b>
          </div>
          <div className="rightpad">
            <div className="card">
              <div className="bar">
                <Terminal />
                Build console{" "}
                <button
                  title="Copy logs"
                  onClick={() => {
                    navigator.clipboard.writeText(logs.join("\n"));
                    A("Logs copied");
                    setTimeout(() => A(""), 1500);
                  }}
                >
                  <Copy />
                </button>
              </div>
              <div className="terminal">
                <div className="traffic">
                  ● <b>●</b> <i>●</i> <span>bash</span>
                </div>
                <code>
                  <b>❯</b> forge init --workspace
                </code>
                {logs.map((s, n) => (
                  <div key={n}>
                    <em>[{String(n).padStart(2, "0")}]</em> {s}
                  </div>
                ))}
                <b>❯ ▋</b>
              </div>
            </div>
            <div className="card">
              <div className="bar">
                <Activity />
                Build pipeline{" "}
                <small>{step < 0 ? "Idle" : source ? "Cloud" : "Demo"}</small>
              </div>
              <div className="pipeline">
                {stages.map((s, j) => (
                  <div className={step >= j ? "done" : ""} key={s}>
                    <i>
                      {step >= j ? (
                        <Check size={11} />
                      ) : (
                        String(j + 1).padStart(2, "0")
                      )}
                    </i>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="bar">
                <Box />
                Artifact inspector
              </div>
              <div className="empty">
                <Package />
                <strong>
                  {step === 5
                    ? artifact
                      ? "Signed APK ready"
                      : "Demo complete"
                    : "No artifact yet"}
                </strong>
                <p>
                  {step === 5
                    ? artifact
                      ? "Scan or download your signed artifact."
                      : "Export the recipe for a worker build."
                    : "Run a build to inspect its output."}
                </p>
                {artifact?.download ? (
                  <>
                    <p>{artifact.bytes} bytes</p>
                    <a href={artifact.download}>Download patched APK</a>
                    <button onClick={() => M("Scan to download")}>
                      QR code
                    </button>
                  </>
                ) : (
                  step === 5 && (
                    <button onClick={() => save(recipe)}>
                      Download recipe
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
      <footer>
        <b>●</b> System ready <span>│</span> Local workspace{" "}
        <div className="grow" />
        <ShieldCheck size={13} /> Authorized use only
      </footer>
      <nav>
        {["Explorer", "Configure", "Console"].map((s, j) => (
          <button
            key={s}
            onClick={() => {
              B(j);
              Q(true);
            }}
          >
            {s}
          </button>
        ))}
      </nav>
      {modal && (
        <div className="overlay">
          <div className="dialog card">
            <div className="bar">
              {modal}
              <button onClick={() => M("")}>
                <X />
              </button>
            </div>
            <div className="fields">
              {modal === "Scan to download" ? (
                <>
                  <QRCodeSVG value={artifact!.download!} />
                  <p style={{ overflowWrap: "anywhere" }}>
                    SHA-256: {artifact?.sha256}
                  </p>
                </>
              ) : modal === "Build status" ? (
                <p>{msg}</p>
              ) : modal === "Upload APK" ? (
                <>
                  <p>Inspect a package locally in this workspace.</p>
                  <label>
                    <input
                      type="checkbox"
                      checked={att}
                      onChange={(e) => V(e.target.checked)}
                    />
                    I own this app or have permission to modify it.
                  </label>
                  <input
                    disabled={!att}
                    type="file"
                    accept=".apk"
                    onChange={(e) => intake(e.target.files?.[0])}
                  />
                  <p>{msg}</p>
                </>
              ) : modal === "Guest session" && client ? (
                <>
                  <h3>Builder access</h3>
                  {token ? (
                    <button onClick={() => client?.auth.signOut()}>
                      Sign out
                    </button>
                  ) : (
                    <>
                      <label>
                        Email address
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => E(e.target.value)}
                        />
                      </label>
                      <button
                        onClick={async () => {
                          const result = await client!.auth.signInWithOtp({
                            email,
                          });
                          A(
                            result.error?.message ||
                              "Check your email for a sign-in link.",
                          );
                        }}
                      >
                        Email sign-in link
                      </button>
                      <button
                        onClick={() =>
                          client?.auth.signInWithOAuth({ provider: "github" })
                        }
                      >
                        Continue with GitHub
                      </button>
                    </>
                  )}
                  <p>{msg}</p>
                </>
              ) : modal === "Guest session" ? (
                <p>
                  You are using the local demo workspace. Recipes and sample
                  builds do not require an account.
                </p>
              ) : (
                <>
                  <p>
                    Install the companion Android app from the published Studio
                    release.
                  </p>
                  <a href="https://github.com/kennedy-blip/patchforge/releases/latest">
                    View latest release ↗
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
