// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const SerialPort = require('serialport');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	var port_paths: String[] = [''];

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "micro-python-terminal" is now active!');

	readAvailablePorts().then((paths) => {
		port_paths = paths;
		console.log(port_paths);
	}).catch((err) => {
		port_paths = err;
	});
	

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('micro-python-terminal.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from µ-python-terminal!');
	});

	context.subscriptions.push(disposable);
}

function readAvailablePorts()  {
	return new Promise<String[]>((resolve, reject) => {
		var paths: String[];
		SerialPort.list().then((ports: [any]) => {
			ports.forEach(port => {
				paths.push(port.path);
			});
			resolve(paths);
		}).catch((err: any) => {
			console.log(err);
			reject(['No devices found.']);
		});;
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}
