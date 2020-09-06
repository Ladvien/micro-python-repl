import { MicroPythonREPL } from './microPythonREPL';
import * as vscode from 'vscode';
const EventEmitter = require('events');

import { delay } from './util';
import * as termCon from './terminalConstants';
import * as fs from 'fs';

export class MicroPythonTerminal {

    eventEmitter = new EventEmitter;
    writeEmitter = new vscode.EventEmitter<string>();
    terminal: vscode.Terminal;

    terminalShowing: boolean;

    constructor() {
        this.terminalShowing = false;
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () =>  this.onOpen(),
            close: () => this.onClose(),
            handleInput: data => this.onUserInput(data)
        };
        
        this.terminal = vscode.window.createTerminal({ name: 'MicroPython', pty });
    }

    sendToTerminal(text: String) {
        this.writeEmitter.fire(<string>text);
    }

    private onOpen() {
        this.terminalShowing = true;
        this.eventEmitter.emit('terminalOpen');
    }
    
    private onUserInput(text: String) {
        this.eventEmitter.emit('termGotUserInput', text);
    }

    private onClose() {
        this.terminalShowing = false;
        this.eventEmitter.emit('terminalClosed');
    }

}