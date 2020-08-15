import * as vscode from 'vscode';
import { delay } from './util';

const DECREASE_INDENT       = '\u0008';
const SPACES_PER_INDENT     = 4;

export class REPLParser {

    constructor() {}

    prepareChunkToSend(textChunk: String, currentIndentLevel: number): Array<String> {
        
        let preparedLines = new Array<String>();
        let lines = textChunk.split('\n'); 
        var neededBreaksOnNextLine = '';

        for (let i = 0; i < lines.length; i++) {
            var line = lines[i];
            line = line.concat(neededBreaksOnNextLine);

            const spacesAtStart = this.getNumberOfSpacesAtStart(line);
            neededBreaksOnNextLine = this.getNeededBreaksAfter(line, currentIndentLevel,);
            const lineStartsAnIndent = this.doesLineStartAnIndent(line);

            line = this.removeLeadingSpaces(line, spacesAtStart);

            // Increase indent if needed.
            if (lineStartsAnIndent) {
                currentIndentLevel++;
                console.log('Increased indent.');
            } 

            preparedLines.push(line);
        }
        return preparedLines;
    }

    removeLeadingSpaces(line: string, spacesAtStart: number): string {
        return line.substring(spacesAtStart);
    }

    getNeededBreaksAfter(line: string, currentIndentLevel: number): string {
        var neededBreaks = "";
        // If indented, check for unindent.
        if (currentIndentLevel > 0) {
            console.log('Added indent');
            for (let i = 0; i < currentIndentLevel; i++) {
                neededBreaks += "_break_";        
            }
            currentIndentLevel = 0;
        }
        console.log(neededBreaks);
        return neededBreaks;
    }

    doesLineStartAnIndent(line: string): boolean {
        return line.endsWith(':');
    }

    getNumberOfSpacesAtStart(line: string): number {
        var numberOfSpaces = 0;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === ' ') { numberOfSpaces++; } else { break; }
        }
        return numberOfSpaces;
    }

    countLineIndents(line: string): number {
        var numberOfSpaces = this.getNumberOfSpacesAtStart(line);
        const numberOfIndents = Math.round(numberOfSpaces / SPACES_PER_INDENT);
        return numberOfIndents;
    }


}