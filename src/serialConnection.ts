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
	lineBuffer: String;

	constructor(serialDevice: ISerialDevice, eventEmitter: typeof EventEmitter) {
		this.lineBuffer = '';

		this.eventEmitter = eventEmitter;
		this.serialDevice = serialDevice;
		try {
			this.port = new SerialPort(this.serialDevice.port, {baudRate: this.serialDevice.baud, autoOpen: false}).setEncoding(encoding);
		} catch (error) {
			this.port = new SerialPort(this.serialDevice.port);
		}
	}

	open(): boolean {
		this.port.open(function (err: any) {
			if (err) {
				return console.log('Error opening port: ', err.message);
			}
			
		});
		this.port.on('open', () => this.onOpen());
		this.port.on('data', (data) => this.onRead(data));
		this.port.on('error', function(err) {
			console.log('Error: ', err.message);
  		});
		return false;
	}

	onRead(data: Buffer) {
		this.eventEmitter.emit('onRead', data.toString());
	}
	
	onOpen(){
		vscode.window.setStatusBarMessage(`Opened ${this.serialDevice.port} at ${this.serialDevice.baud}`);
	}

	write(line: string) {
		this.port.write(line, function(err) {
			if (err) {
			  console.log('Error on write: ', err.message);
			}
			console.log(`wrote: ${line}`);
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
}
