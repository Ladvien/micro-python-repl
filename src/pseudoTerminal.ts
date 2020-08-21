import * as vscode from 'vscode';
import { delay } from './util';
// https://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html

export class MicroPythonTerminal {

    DELAY_BEFORE_WELCOME: number;

    CLEAR_ALL: string;
    UP: string;
    DOWN: string;
    RIGHT: string;
    LEFT: string;
    BACKSPACE: string;
    BACKSPACE_CLEAR: string;
    SPACES_PER_INDENT: number;
    REDUCE_INDENT: string;
    EXEC: string;
    WELCOME_MSG: string;
    TERM_COLUMNS: number;
    TERM_ROWS: number;
    ESC: string;
    RESET: string;
    RESET_CUR: string;

    writeEmitter: vscode.EventEmitter<string>;
    columnIndex: number;

    constructor() {
        this.DELAY_BEFORE_WELCOME = 1200;

        this.TERM_COLUMNS = 120;
        this.TERM_ROWS = 20;
        
        this.SPACES_PER_INDENT     = 4;
        
        this.ESC                   = `\u001b`;
        this.CLEAR_ALL             = `${this.ESC}[2J`;
        this.RESET                 = `${this.ESC}c`;
        this.RESET_CUR             = `${this.ESC}[0;0H`;
        
        this.UP                    = `${this.ESC}\u005b\u0041`;
        this.DOWN                  = `${this.ESC}\u005b\u0042`;
        this.RIGHT                    = `${this.ESC}\u005b\u0043`;
        this.LEFT                  = `${this.ESC}\u005b\u0044`;

        this.BACKSPACE             = '\u0008';
        this.BACKSPACE_CLEAR       = `${this.BACKSPACE} ${this.BACKSPACE}`;
        this.REDUCE_INDENT         = this.BACKSPACE; 
        this.EXEC                  = '\r\n';

        this.WELCOME_MSG = 'Welcome to MicroPython Terminal\r\n' +
                           '>>> ';
                           this.columnIndex = 0;
                           
                           this.writeEmitter = new vscode.EventEmitter<string>();
        const termDims: vscode.TerminalDimensions = {rows: this.TERM_ROWS, columns: this.TERM_COLUMNS};
        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => this.open(),
            close: () => this.close(),
            handleInput: data => this.userInput(data),
        };
        vscode.window.createTerminal({ name: 'MicroPython', pty });
    }

    async open() {
        await delay(this.DELAY_BEFORE_WELCOME);
        this.sendText(this.CLEAR_ALL);
        this.sendText(this.WELCOME_MSG);
        this.columnIndex = 4;
    }

    close() {
        console.log("MicroPy Term closed.");
    }

    clearScreen() {
        this.sendText(this.CLEAR_ALL);
        this.sendText(this.RESET_CUR);
    }

    async userInput(data: string){
        data = this.parseInput(data);
        this.sendText(data);
    }

    sendText(line: string) {
        if(line.endsWith(this.EXEC)) {
            line += ">>> ";
        }
        this.writeEmitter.fire(line);
    }

    toHex(str: string) {
        var result = '';
        for (var i=0; i<str.length; i++) {
          result += str.charCodeAt(i).toString(16) + ' ';
        }
        return result;
    }

    parseInput(data: string): string {
        switch (data) {
            case `\u007f`:
                console.log(this.columnIndex);
                // If user backspaces, backup, replace with space, 
                // backup again.
                if (this.columnIndex > 4){
                    data = this.BACKSPACE_CLEAR;
                    this.columnIndex--;
                }
                break;
            case '\r': 
                data = '\r\n';
                this.columnIndex = 4;
                break;
            case this.UP:
                data = '';
                break;
            case this.DOWN:
                data = '';
                break;
            case this.RIGHT:
                data = '';
                break;
            case this.LEFT:
                data = '';
                break;
            default:
                data = data.replace('^([\w,:\s/-]*)$', data);
                this.columnIndex++;
                break;
        }
        return data;
    }

    private debugSend(data: string, sendStr: string) {
        console.log(this.toHex(sendStr));
        console.log(this.toHex(data));
    }
}

