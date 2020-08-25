import * as vscode from 'vscode';
import { ISerialDevice } from './SerialDevice';
import SerialPort = require('serialport');
import { delay } from './util';
const EventEmitter = require('events');

const encoding = 'utf8'; // https://www.w3resource.com/node.js/nodejs-buffer.php

export class SerialConnection {

	port: SerialPort;
	serialDevice: ISerialDevice;
	eventEmitter: typeof EventEmitter;

	constructor(serialDevice: ISerialDevice, eventEmitter: typeof EventEmitter) {
		this.eventEmitter = eventEmitter;
		this.serialDevice = serialDevice;
		try {
			this.port = new SerialPort(this.serialDevice.port, { baudRate: this.serialDevice.baud, autoOpen: false }).setEncoding(encoding);
		} catch (error) {
			this.port = new SerialPort(this.serialDevice.port);
		}
	}

	open(): boolean {
		this.port.open(function (err: any) {
			if (err) {
				vscode.window.showErrorMessage('Error opening device.', err);
				return;
			}
		});
		this.port.on('open', () => this.onOpen());
		this.port.on('data', (data) => this.onRead(data));
		this.port.on('error', function(err) {
			vscode.window.showErrorMessage('Error opening device.', err);
  		});
		return false;
	}

	write(line: string) {
		this.port.write(line, (err) => {
			if (err) {
				vscode.window.showErrorMessage(`Error writing to device.`, err.message);
			}
		});
	}

	reset(): Promise<boolean> {
		return new Promise(async (resolve) => {
			this.port.set( {dtr: false });
			await delay(600);
			this.port.set( {dtr: true });
			await delay(100);
			resolve(true);
		});
	}

	close(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			this.port.close((err) => {
				if(!err) {
					resolve(true);
				}
				reject(false);
			});
		});
	}

	nonAsciiToHex(line: String): String {
        let parsedString = "";
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const rawChar = char.charCodeAt(0);
            if (rawChar >= 32 && rawChar < 127 || rawChar === 10) {
                parsedString += char;
            } else {
                parsedString += '0x' + rawChar.toString(16);
            }
        }
        return parsedString;
	}
	
	private onRead(data: Buffer) {
		this.eventEmitter.emit('onRead', data.toString());
	}
	
	private onOpen(){
		vscode.window.setStatusBarMessage(`Opened ${this.serialDevice.port} at ${this.serialDevice.baud}`);
	}
}
