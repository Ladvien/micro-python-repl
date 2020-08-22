import * as vscode from 'vscode';
import { delay } from './util';
import * as termCon from './terminalConstants';

export class IParseResults {
    line: String;
    columnIndex: Number;
    constructor(line: String, columnIndex: Number) {
        this.line = line;
        this.columnIndex = columnIndex;
    }
}


export class REPLParser {
    BACKSPACE: string;
    SPACES_PER_INDENT: number;
    REDUCE_INDENT: string;
    EXEC: string;

    constructor() {
        this.BACKSPACE             = '\u0008';
        this.SPACES_PER_INDENT     = 4;
        this.REDUCE_INDENT         = this.BACKSPACE; 
        this.EXEC                  = '\n';
    }

    prepareInputChunk(textChunk: String): Array<String> {
        
        let preparedLines = new Array<String>();
        let lines = textChunk.split('\n'); 
        let neededBreaks = '';

        lines = this.removeEmptyLines(lines);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            neededBreaks = this.getNeededBreaksAfter(lines, i);
            line = line.concat(neededBreaks);
            line = this.removeLeadingSpaces(line);
            preparedLines.push(line);
        }
        return preparedLines;
    }

    removeEmptyLines(lines: string[]): string[] {
        let cleanLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if(line.trim() === ''){ continue; }
            cleanLines.push(line);
        }
        return cleanLines;
    }

    removeLeadingSpaces(line: string): string {
        return line.substring(this.getNumberOfSpacesAtStart(line));
    }

    getNeededBreaksAfter(lines: string[], currentPos: number): string {
        let neededBreaks = '';
        let nextLineIndents = 0;

        const currentIndentLevel = this.countLineIndents(lines[currentPos]);
        if(currentPos + 1 !== lines.length) { 
            nextLineIndents = this.countLineIndents(lines[currentPos + 1]);
        }
        
        const numberIndentsToReduce = currentIndentLevel - nextLineIndents;
  
        // If indented, check for unindent.
        if (currentIndentLevel > 0 &&  numberIndentsToReduce > 0) {
            neededBreaks += this.EXEC;
            for (let i = 0; i < numberIndentsToReduce; i++) {
                neededBreaks += this.REDUCE_INDENT;
            }
        }
        neededBreaks += this.EXEC;
        return neededBreaks;
    }

    getNumberOfSpacesAtStart(line: string): number {
        let numberOfSpaces = 0;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === ' ') { numberOfSpaces++; } else { break; }
        }
        return numberOfSpaces;
    }

    countLineIndents(line: string): number {
        const numberOfSpaces = this.getNumberOfSpacesAtStart(line);
        const numberOfIndents = Math.floor(numberOfSpaces / this.SPACES_PER_INDENT);
        return numberOfIndents;
    }

    parseInput(data: string, columnIndex: number): IParseResults {
        switch (data) {
            case `\u007f`:
                // If user backspaces, backup, replace with space, 
                // backup again.
                if (columnIndex > 4){
                    data = termCon.BACKSPACE_CLEAR;
                    columnIndex--;
                }
                break;
            case '\r': 
                data = '\r\n';
                columnIndex = 4;
                break;
            case termCon.UP:
                data = '';
                break;
            case termCon.DOWN:
                data = '';
                break;
            case termCon.RIGHT:
                data = '';
                break;
            case termCon.LEFT:
                data = '';
                break;
            default:
                data = data.replace('^([\w,:\s/-]*)$', data);
                columnIndex++;
                break;
        }
        return new IParseResults(data, columnIndex);
    }


}