import handler from 'vinext/server/fetch-handler';
import {createSecureHandler} from './lib/security.mjs';

export default {fetch:createSecureHandler(handler.fetch.bind(handler))};
