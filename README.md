* # micro-python-terminal README


## Features

A robust MicroPython terminal for Visual Studio Code.  Unlike other VSCode extensions for interacting with MicroPython devices, this terminal focuses on an interactive REPL and ease of use.  And most importantly, no middleware are required to connect the text VSCode editor to the MicroPython REPL.

* Send code directly to MicroPython REPL from VSCode editor
![send-code-to-micro-repl](examples/micro-python-terminal-example.gif)
* Real feedback loop.  Code will not execute until REPL is ready.
![wait-until-micro-python-repl-is-ready](examples/micro-python-terminal-feedback-loop.gif)
* Easy to use device selector.
![micro-python-device-selector](examples/micro-python-terminal-device-selector.gif)
## Requirements

None

## Extension Settings

This extension contributes the following settings:

* `micro-python-terminal.createTerm`: Creates a new integrated terminal, connected to MicroPython device through serial connection.
* `micro-python-terminal.selectDevice`: Lists all connected serial devices and sets the MicroPython device.
* `micro-python-terminal.sendTextTermCommand`: Sends the selected text in the active text editor to the MicroPython REPL.

## Scrum Board
Work for this project is managed using Scrum and the board is public:

* [MicroPython Terminal Scrum Board](https://trello.com/b/pUhIt08d/micropython-terminal)

## Known Issues

None yet.
## Release Notes

### 0.0.2
* Send to REPL
* Create MicroPython Terminal
* Select MicroPython USB device
* 82 unit tests


-----------------------------------------------------------------------------------------------------------