import {expect} from "chai";
import {RemoteFileClient} from "../src/RemoteFileClient";
import {RemoteFileServer} from "../src/RemoteFileServer";

const PORT = 9999;

describe("测试",()=>{

    it('基本功能测试',()=>{
       let server = new RemoteFileServer(PORT,async (file)=>{
            return {err:"err",params:{he:1}};
        });

        setTimeout(async ()=>{
            let client = new RemoteFileClient(`http://127.0.0.1:${PORT}`);
            let info = await client.process({file:"./test/test.ts"});
            expect(info.err).equal("err");
            expect(info.params.he).equal(1);
            server.clean();
            server.close();
        },1000);
    });
});