import * as vscode from 'vscode';
import { window } from 'vscode';
import { Position, Range } from 'vscode';

import { selectPort, selectBaud } from './serialPort';

import { checkIfMicroPyTermExists, sendTextToTerm, ensureTerminalExists, 
	     selectTerminal, selectMicroPythonTerm } from './pyTerminal';



import { delay } from './util';
import { REPL } from './repl';
const SerialPort = require('serialport');


const SEND_THROTTLE = 100;

let repl: REPL;


export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "micro-python-terminal" is now active!');

	let disposable = vscode.commands.registerCommand('micro-python-terminal.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from µ-python-terminal!');
		
	});

	let sendTextTermCommand = vscode.commands.registerCommand('micro-python-terminal.sendTextTermCommand', async () => {
		const terminal = selectMicroPythonTerm(vscode.window.terminals);
		if (undefined !== terminal){
			if (undefined !== window.activeTextEditor?.document) {
				const doc = window.activeTextEditor?.document;
				const { start, end } = window.activeTextEditor.selection;
				const textRange = new Range(start, end);

				let lines = doc.getText(textRange).split('\n'); 

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					line !== '\n' ? terminal.sendText(line.trim()) : true ;
					console.log(line);
					await delay(SEND_THROTTLE);
				}
			}
		} else {
			window.showErrorMessage('No open document.')
		}
	});


	let microPyTerm = vscode.commands.registerCommand('micro-python-terminal.createTerm', () => {
		const terminal = selectMicroPythonTerm(vscode.window.terminals);
		if (terminal !== undefined) {
			selectPort(SerialPort).then((port) => {
				selectBaud().then(async (baud) => {
					repl = new REPL(terminal, port, baud);
					await repl.connect();
				}).catch((err) => {
					console.log(err);
				});
			}).catch((err) => {
				console.log(err);
			});
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(microPyTerm);
	context.subscriptions.push(sendTextTermCommand)
}

export function deactivate() {
	if (ensureTerminalExists()) {
		selectTerminal().then(terminal => {
			if (terminal) {
				repl.quit();
				terminal.dispose();
			}
		});
	}
}
