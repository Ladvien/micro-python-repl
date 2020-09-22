import * as vscode from 'vscode';
import { ISerialDevice } from './interfaces/SerialDevice';
const SerialPort = require('node-usb-native').SerialPort;
import { delay } from './util';

const EventEmitter = require('events');
const encoding = 'utf8'; // https://www.w3resource.com/node.js/nodejs-buffer.php

export class SerialConnection {

	port: typeof SerialPort;
	serialDevice: ISerialDevice;
	eventEmitter: typeof EventEmitter;
	connected: boolean;
	isOpening: boolean;
	deviceInError: boolean;

	constructor(serialDevice: ISerialDevice, eventEmitter: typeof EventEmitter) {
		this.connected = false;
		this.isOpening = false;
		this.deviceInError = false;
		this.eventEmitter = eventEmitter;
		this.serialDevice = serialDevice;
		try {
			this.port = new SerialPort(this.serialDevice.port, { baudRate: this.serialDevice.baud, autoOpen: false }).setEncoding(encoding);
		} catch (error) {
			this.port = new SerialPort(this.serialDevice.port);
		}
		this.port.on('data', (data: Buffer) => this.onRead(data));
		this.port.on('disconnect', () => this.onDisconnect());
		this.port.on('close', () => this.onClose());
		this.port.on('error', (err: Error) => this.onError(err));
	}

	open() {
		if(this.port.isOpen) { 
			this.connected = true; 
			this.isOpening = false;
			return;
		}
		this.isOpening = true;
		this.port.open(() => this.onOpened());
	}

	async onOpened() {
		this.isOpening = false;
		this.connected = true;
		this.eventEmitter.emit('onOpen');
	}

	write(line: string) {
		if(!this.connected) { return; }
		this.port.write(line, (err: { message: any; }) => {
			if (err) {
				vscode.window.showErrorMessage(`Error writing to device.`, err.message);
			}
		});
	}

	reset(): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			this.port.set( {dtr: false });
			await delay(200);
			this.port.set( {dtr: true });
			await delay(1700);
			resolve(true);
		});
	}

	close(): Promise<string> {
		return new Promise((resolve, reject) => {
			if(!this.port.isOpen) { resolve(this.port.path); }
			this.port.close((err: any) => {
				if(!err) {
					resolve(this.port.path);
				}
				reject(`Unable to close ${this.port.path}`);
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

	isDeviceConnected(): Promise<boolean> {
		return new Promise((resolve, reject) => {
			SerialPort.list().then((ports: any[]) => {
				let found = ports.some((port: { path: string; }) => port.path === this.serialDevice.port);
				console.log(found);
				resolve(found);
			}).catch((err: any) => {
				reject(false);
			}); 
		});
	}

	private onRead(data: Buffer) {
		this.deviceInError = false;
		this.eventEmitter.emit('onRead', data.toString());
	}

	private onDisconnect() {
		this.lostConnection('onDisconnect');
	}

	private onClose() {
		this.lostConnection('onClose');
	}

	private failedOpen(message: String) {
		this.connected = false;
		this.isOpening = false;
		this.eventEmitter.emit('onFailedOpen', message);
	}
	
	private onError(err: Error) {

		this.connected = false;
		
		if(!this.deviceInError) {
			console.log(err.name);
			this.failedOpen(err.message);
			this.deviceInError = true;
			setTimeout(() => { this.deviceInError = false; }, 800);
		}
	}

	private lostConnection(disconnectType: string, err?: Error) {
		this.connected = false;
		if(err) {
			this.eventEmitter.emit(disconnectType, err);
		} else {
			this.eventEmitter.emit(disconnectType, err);	
		}
	}
	
}
