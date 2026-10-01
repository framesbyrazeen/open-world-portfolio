import { Events } from './Events.js'

// Static portfolio: never connect to the original site's multiplayer service.
export class Server {
    constructor() {
        this.connected = false
        this.initData = null
        this.events = new Events()
        document.documentElement.classList.add('is-server-offline')
    }
    start() {}
    send() { return false }
}
