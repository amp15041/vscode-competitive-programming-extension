import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class TemplateGenerator {
    private disposables: vscode.Disposable[];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.disposables = [];
        this.context = context;
        this.registerCommands();
    }

    public dispose() {
        this.disposables.forEach(disposable => {
            disposable.dispose();
        });
    }

    private async createTemplateFile(filePath: string): Promise<void>  {
        const response = await vscode.window.showInputBox({placeHolder: 'Please enter the template file name. (Eg: template-<filename>.<extensioon>)'});
        if(response && response.match(/template-.*\..*/i)) {
            const file = path.join(filePath, response);
            fs.writeFileSync(file, "");
            const uri: vscode.Uri = vscode.Uri.file(file);
            await vscode.window.showTextDocument(uri);
            vscode.workspace.getConfiguration().update('cp.defaultTemplate', file);
        } else if(response) {
            vscode.window.showErrorMessage('Please follow the naming format for template.');
        }
    }

    private async templatesWindow(): Promise<void> {
        if (vscode.workspace.workspaceFolders) {
            // Considering only one WorkspaceFolder is opened in VSCode
            const templateFilesPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode');

            let templates: string[] = [];
            fs.readdirSync(templateFilesPath).forEach(file => {
                if(file.match(/template-.*\..*/i)) {
                    templates.push(file);
                }
            });
            templates.push('New Template Configuration...');

            const response = await vscode.window.showQuickPick(templates);
            if(response && response.includes('New Template Configuration...')) {
                await this.createTemplateFile(templateFilesPath);
            } else if (response) {
                vscode.workspace.getConfiguration().update('cp.defaultTemplate', path.join(templateFilesPath, response), true);
            }
        } else {
            vscode.window.showErrorMessage('Please open a Folder to enable this Extension');
        }
    }

    private async openNewFile(): Promise<void>  {
        const templateFilePath = vscode.workspace.getConfiguration().get<string>('cp.defaultTemplate');
        if (vscode.workspace.workspaceFolders) {
            // Considering only one WorkspaceFolder is opened in VSCode
            const workspaceFolderPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            if(templateFilePath && fs.existsSync(vscode.Uri.file(templateFilePath).fsPath)) {
                const filePath = vscode.Uri.file(templateFilePath).fsPath;
                const content = fs.readFileSync(filePath);
                const parts = filePath.split('.');
                const ext = parts[parts.length - 1];
                const fileNamePrefix = vscode.workspace.getConfiguration().get<string>('cp.fileNamePrefix');
                let iterator = 1;
                let file = path.join(workspaceFolderPath, fileNamePrefix + '-' + iterator + '.' + ext);
                while(fs.existsSync(vscode.Uri.file(file).fsPath)) {
                    iterator = iterator + 1;
                    file = path.join(workspaceFolderPath, fileNamePrefix + '-' + iterator + '.' + ext);
                }
                const uri: vscode.Uri = vscode.Uri.file(file);
                fs.writeFileSync(uri.fsPath, content);
                await vscode.window.showTextDocument(uri);     
            } else {
                vscode.window.showErrorMessage('Please configure template file path.');
            }
        } else {
            vscode.window.showErrorMessage('Please open a Folder to enable this Extension');
        }
    }

    private registerCommands(): void {
        this.context.subscriptions.push(vscode.commands.registerCommand('CP.ConfigureTemplate', () => {
           this.templatesWindow();
        }));
        this.context.subscriptions.push(vscode.commands.registerCommand('CP.OpenNewFile', () => {
            this.openNewFile();
         }));
    }
}