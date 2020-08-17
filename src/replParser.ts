import * as vscode from 'vscode';
import { delay } from './util';



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

    prepareChunkToSend(textChunk: String): Array<String> {
        
        let preparedLines = new Array<String>();
        let lines = textChunk.split('\n'); 
        let neededBreaks = '';

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            neededBreaks = this.getNeededBreaksAfter(lines, i);
            line = line.concat(neededBreaks);
            line = this.removeLeadingSpaces(line);
            preparedLines.push(line);
        }
        return preparedLines;
    }

    removeLeadingSpaces(line: string): string {
        return line.substring(this.getNumberOfSpacesAtStart(line));
    }

    getNeededBreaksAfter(lines: string[], currentPos: number): string {
        let neededBreaks = "";

        const currentIndentLevel = this.countLineIndents(lines[currentPos]);
        if(currentPos + 1 === lines.length) { return this.EXEC; }

        const nextLineIndents = this.countLineIndents(lines[currentPos + 1]);
        const numberIndentsToReduce = currentIndentLevel - nextLineIndents;

        // If indented, check for unindent.
        if (currentIndentLevel > 0 &&  numberIndentsToReduce > 0) {
            for (let i = 0; i < currentIndentLevel; i++) {
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


}