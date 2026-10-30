import BaseLockup from "@/components/BaseLockup";
import { RISK_FOOTER } from "@/lib/legos";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BaseLockup />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.brandName}>Money Legos</span>
      </header>
      <main className={styles.main}>
        <h1 className={styles.h1}>Snap together a money app.</h1>
        <p className={styles.subline}>Pick 2 to 4 Base building blocks. Get an app idea and a prompt for your coding agent.</p>
        <p className={styles.label}>1 Pick Legos · 2 Snap them on · 3 Copy your prompt</p>
      </main>
      <footer className={styles.footer}>
        <p>{RISK_FOOTER}</p>
      </footer>
    </div>
  );
}
