import * as vscode from 'vscode';
import { delay } from './util';
import * as termCon from './terminalConstants';

export class REPLParser {

    constructor() {}

    prepareInputChunk(textChunk: String): Array<String> {
        
        let preparedLines = new Array<String>();
        let lines = textChunk.split('\n');

        lines = lines.map(line => line.replace('\n', ''));
        lines = this.removeEmptyLines(lines);
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            line = line.concat(this.getNeededBreaksAfter(lines, i));
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
            neededBreaks += termCon.EXEC;
            for (let i = 0; i < numberIndentsToReduce; i++) {
                neededBreaks += termCon.REDUCE_INDENT;
            }
        }
        neededBreaks += termCon.EXEC;
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
        const numberOfIndents = Math.floor(numberOfSpaces / termCon.SPACES_PER_INDENT);
        return numberOfIndents;
    }

}