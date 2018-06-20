import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';
import 'polymer-print';
import 'polymer-qrcode';
import 'polymer-store';
import 'polymer-aes';
import 'polymer-bip39';
/**
 * `eos-paper`
 * 
 *
 * @customElement
 * @polymer
 * @demo demo/index.html
 */
class EosPaper extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
      </style>
      <polymer-print id="print"></polymer-print>
      <polymer-qrcode id="qrcode"></polymer-qrcode>
      <polymer-bip39 id="bip39"></polymer-bip39>
      <polymer-aes id="aes"></polymer-aes>
      <polymer-store id="store"></polymer-store>

      <template is="dom-if" if="{{debug}}">
        <h2>[[error]]</h2>
      </template>
    `;
  }
  static get properties() {
    return {
      idHash: {
        type: String,
        observer: '_paperWallet'
      },
      error: {
        type: String,
        notify: true,
        reflectToAttribute: true,
      },
      debug: {
        type: Boolean,
        value: false,
      },
      password: {
        type: String,
      },
      publicKey: {
        type: String,
      },
      privateKey: {
        type: String,
      },
    };
  }

  _paperWallet(){
    this.paperWallet(this.password)
    .catch((err) => {
      this.error = err;
    })
  }
  paperWallet(password){
    return new Promise((resolve, reject) => {
      this.state()
      .then((state) => {
        if(state !== 'unlocked') throw 'not unlocked'
        return Promise.all([this.$.bip39.mnemonicfromPassword(password), this.$.store.get('EOSAccount')])
      })
      .then((data) => {
        const key = JSON.parse(data[0])[1];
        const account = JSON.parse(data[1]);
        // TODO: find the identity index that matches the idhash
        const encryptedPrivateKey = account.keychain.identities[0].privateKey;
        this.publicKey = account.keychain.identities[0].publicKey;
        return this.$.aes.decrypt(key, encryptedPrivateKey)
      })
      .then((privateKey) => {
        this.privateKey = privateKey;
        return Promise.all([this.$.qrcode.make(this.publicKey), this.$.qrcode.make(privateKey)])
      })
      .then((qrcode) => {
          const publicQr = qrcode[0];
          const privateQr = qrcode[1];
          const htmlToPrint = `
          <html>
          <head>
          <title>EOS Paper Wallet</title>
            <style>
            :host {
              display: block;
            }
            .container {
              width: 100%; 
              height: 200px;
              display: flex; 
              flex-wrap: nowrap;
              padding: 20px;
            }
            .qrcode {
              width: 250px%; 
              height: 250px;
              padding: 20px;
            }
            .text-container{
              padding-left: 50px;
            }
            </style>
          </head>
          <body>
            <div class="container">
            <div class="qrcode"><img src="${publicQr}"></div>
            <div class="qrcode""><img src="${privateQr}"></div>
            </div>
            <div class="text-container">
            <div>Public Key: ${this.publicKey}</br></br> Private Key: ${this.privateKey}</div>
            </div>
          </body>
          </html>
          `;
          console.log(htmlToPrint)
          this.$.print.print(htmlToPrint)
      })
      .catch((err) => {
        this.error = err;
        reject(this.error)
      })
    })
  }

  state(){
    return new Promise((resolve, reject) => {
      this.$.store.get('EOSAccount')
      .then((EOSAccount) => {
        EOSAccount = (JSON.parse(EOSAccount))
        if (EOSAccount && EOSAccount.meta) {
          this.accountState = 'unlocked'
          resolve('unlocked')
        } else if (EOSAccount && EOSAccount.iv) {
          this.accountState = 'locked'
          resolve('locked')
        } else {
          this.accountState = 'none'
          resolve('none')
        }
      })
      .catch((err) => {
        this.error = err;
        reject(this.error)
      })
    })
  }
} window.customElements.define('eos-paper', EosPaper);
