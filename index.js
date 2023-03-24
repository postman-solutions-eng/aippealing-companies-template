const pm = require('@postman/postman-sdk');

const collectionId = process.env.POSTMAN_LIVE_COLLECTION_ID || '24435735-ac9b2109-076d-4132-a38b-75229a0fc795';
const apiKey = process.env.POSTMAN_LIVE_API_KEY || 'PMAK-redacted';

pm.initialize({
  collectionId: collectionId,
  apiKey: apiKey,
  truncateData: false,
  debug: false,
  redactSensitiveData: {
    enable: true,
    rules: {
      open_api_key: 'sk-[a-zA-Z0-9]{48}',
      api_key: 'PMAK-[a-zA-Z0-9]{59}',
      email_rule: '([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})',
      bearerToken: '[bB]earer ([a-zA-Z]+[0-9]|[0-9]+[a-zA-Z]])[a-zA-Z0-9/+_.-]{15,1000}(?![a-zA-Z0-9/+.-])'
    }
  }
});

const config = require('./config');
const logger = require('./logger');
const ExpressServer = require('./expressServer');

const launchServer = async () => {
  try {
    this.expressServer = new ExpressServer(config.URL_PORT, config.OPENAPI_YAML);
    this.expressServer.launch();
    logger.info('Express server running');
  } catch (error) {
    logger.error('Express Server failure', error.message);
    await this.close();
  }
};

launchServer().catch(e => logger.error(e));
