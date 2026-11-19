import "./style.css";
export const metadata = {
  title: "PatchForge Studio",
  description: "Android package customization workspace",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
