import express from "express";
import _ from "lodash";
import http from 'http';
import fs from 'fs';
import path from "path";
import multer from 'multer';
import bodyParser from 'body-parser';
import * as dbuf from 'dbuf';
export interface FileDict{
    [fieldname:string]:string;
}

export interface RemoteFileResInfo{
    err?:string;
    files?: FileDict,
    params?:any,
}

export interface ServerOption{
    uploadFolder?:string;
    cleanUpTime?:number;
}

export class RemoteFileServer{
    private port:number;
    private uploadFolder:string;
    private cleanUpTime:number;
    private server:http.Server;
    private timeHandler:NodeJS.Timeout;
    private processor:(files:FileDict,params?:any)=>Promise<RemoteFileResInfo>;
    constructor(port:number,processor:(files:FileDict,params?:any)=>Promise<RemoteFileResInfo>,option?:ServerOption){
        
        this.port = port;
        this.processor = processor;
        this.uploadFolder = (option && option.uploadFolder) || 'uploads/';
        this.cleanUpTime = (option && option.cleanUpTime) || 2*24*3600*1000;
        this.start();
    }

    private async message(req:express.Request,res:express.Response){
        let params:any;
        if(req.body.params){
            params = JSON.parse(req.body.params);
        }
        
        
        let infos:Express.Multer.File[] = <any>req.files;
        let files:{[fieldname:string]:string} = {};
        infos.map(info=>files[info.fieldname]=info.path);

        let info = await this.processor(files,params);
      
        let wb = new dbuf.DWriteBuf();

        wb.writeString(info.err?info.err:"");
        wb.writeString(info.params?JSON.stringify(info.params):"");
        
        wb.writeInt32(info.files?_.size(info.files):0);
        for(let name in info.files){
            wb.writeString(name);
            wb.writeBuffer(fs.readFileSync(info.files[name]));
        }
        res.end(wb.toBuffer());
    }

    private start(){
        const app = express();

        app.use(bodyParser.urlencoded({extended: true}));

        const upload = multer({ dest: this.uploadFolder });

        app.post('/r',upload.any(),this.message.bind(this));
        

        this.server = http.createServer(app).listen(this.port,()=>{
            console.log("server started",this.port);
        });

        this.timeHandler = setInterval(this.clean.bind(this),this.cleanUpTime);
    }

    clean(){
        if(!fs.existsSync(this.uploadFolder)){
            return;
        }
        let files = fs.readdirSync(this.uploadFolder);
        let deadtime = new Date().getTime() - this.cleanUpTime;
        files.map(file=>{
            let filePath = path.resolve(this.uploadFolder,file);
            let st = fs.statSync(filePath);
            if(deadtime > new Date(st.birthtime).getTime()){
                fs.unlinkSync(filePath);
            }
          
        });
        
    }

    close(){
        if(this.timeHandler){
            clearInterval(this.timeHandler);
        }
        this.server.close();
    }
}