import styles from '@pages/index.module.scss';

import * as React from 'react';
import * as Requests from '@common/requests';
import * as Utilities from '@common/utilities';

import App from '@components/App';

function Home(props) {
  const { host } = props;

  let title = `CONCEPTS`;
  let description = `Experiments by the Internet Development Studio Company`;
  let url = `https://${props.host}`;

  return (
    <App title={title} description={description} url={url}>
      <a href="/concepts/1">[1]</a>
    </App>
  );
}

export async function getServerSideProps(context) {
  return {
    props: { host: context.req.headers.host },
  };
}

export default Home;
