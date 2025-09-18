import styles from '@pages/concepts/page.module.scss';

import dynamic from 'next/dynamic';
import App from '@components/App';
import Logo from '@components/Logo';

const Sphere = dynamic(() => import('@components/client/SphereEntity'), {
  ssr: false,
});

const Simulation = dynamic(() => import('@components/client/Simulation'), {
  ssr: false,
});

function One(props) {
  const { host } = props;

  let title = `1`;
  let description = '9-17-2025';
  let exploration = `PRISM EXPLORATION`;
  let url = `https://${props.host}/concepts/1`;

  return (
    <App title={title} description={description} url={url}>
      <div className={styles.layout}>
        <div className={styles.top}>
          <Simulation backgroundImageURL={`/client/bg.jpeg`}>
            <Sphere initialPosition={{ x: 0, y: -50, z: 0 }} />
          </Simulation>
        </div>
        <div className={styles.bottom}>
          <div className={styles.left}>
            <div>{title}</div>
            <div>{description}</div>
            <div>{exploration}</div>
          </div>
          <div className={styles.middle}>
            I made a prism mesh in ThreeJS, shaped and animated through shaders. On top of that I added filters, not merely to alter the appearance, but to lend the whole
            composition a more harmonious quality.
          </div>
          <div className={styles.right}>
            <Logo height="48px" />
          </div>
        </div>
      </div>
    </App>
  );
}

export async function getServerSideProps(context) {
  return {
    props: { host: context.req.headers.host },
  };
}

export default One;
