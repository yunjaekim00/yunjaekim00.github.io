import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
//import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={clsx(styles.buttoncontainer)}>
          <div className={clsx(styles.buttons)}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro">
              YJK's blog
            </Link>
          </div>
          <div className={clsx(styles.buttons)}>
            <Link
              className="button button--secondary button--lg"
              to="https://x2bee.tistory.com">
              Plateer 연구소 블로그
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      {/*<main>*/}
      {/*<HomepageFeatures />*/}
      {/*</main>*/}
    </Layout>
  );
}
