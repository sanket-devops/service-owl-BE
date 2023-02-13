import {IhostMetrics, Idashboard, IPort, Ispeedtest} from './interfaces/Idashboard';
import {EStatus} from './interfaces/enums/EStatus';
import { table, getBorderCharacters } from 'table';
import Fastify from 'fastify'
import cors from '@fastify/cors'
import moment from 'moment';
import * as http from 'http';
import * as https from 'https';
import { Client } from 'ssh2';

import { exec } from 'child_process';

process.on('unhandledRejection', (error: Error, promise) => {
    console.log(error);
});
process.on('uncaughtException', function(error, origin) {
    console.log(error);
});

const CryptoJS = require('crypto-js');
let k = `j@mesbond`; // j@mesbond

const fastify = Fastify()

let app = fastify;
fastify.register(cors, { 
    // put your options here
  })
const tcpPortUsed = require('tcp-port-used');
const mongoose = require('mongoose');
// mongoose.set('useFindAndModify', false);
const boom = require('boom');
const bodyParser = require('body-parser');
const hostname = '0.0.0.0';
const port = 8002;
let owlModel = require('./owl.model');
let db = 'mongodb://service-owl:ecivreS8002lwO@192.168.120.135:27017/service-owl?authSource=admin';
// let db = 'mongodb://service-owl:ecivreS8002lwO@192.168.10.108:27017/service-owl?authSource=admin';
let allData = [];
let nodemailer = require('nodemailer');

// mongoose.Promise = global.Promise;

mongoose.connect(db, {
    // promiseLibrary: Promise,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log(`MongoDB Connected: ${db}`)).catch(console.error);

app.listen({port: port, host: hostname}, function () {
    console.log(`service-owl app listen at : http://${hostname}:${port}`)
});

function getEncryptedData(data: any) {
    let encryptMe;
    if (typeof data === 'object') encryptMe = JSON.stringify(data);
    return CryptoJS.AES.encrypt(encryptMe, k).toString();
}

function getDecryptedData(ciphertext: any) {
    let bytes = CryptoJS.AES.decrypt(ciphertext, k);
    return bytes.toString(CryptoJS.enc.Utf8);
}

let counter = 1;
let isOwlChekcing: boolean;
const allServiceHost = async () => {
    console.log(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Start =>`, counter,`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    isOwlChekcing = true;
    let startDate = new Date().getTime();
    let allData: Idashboard[] = <any>await owlModel.serviceHost.find({}).select('ipAddress userName userPass hostName port hostMetrics hostCheck metricsCheck').lean().exec();
    allData = JSON.parse(JSON.stringify(allData));
    let servicesPromiseArr: Promise<any>[] = [];
    // loop services
    for (let item of allData) {
        if (item.hostCheck === true) {
            servicesPromiseArr.push(new Promise<void>(async (resolve, reject) => {
                let upCount = 0;

                let downCount = 0;
                let portsPromiseArr: Promise<any>[] = [];
                let hostMetricsPromiseArr: Promise<any>[] = [];
                if (item.metricsCheck) {
                    if (item._id && item.userName && item.userPass) {
                        hostMetricsPromiseArr.push(new Promise<void>(async (resolve, reject) => {
    
                            let host = item.ipAddress;
                            let port = 22;
                            let username = item.userName;
                            let password = item.userPass;
    
                            // let keepMetrics = 288 //24H // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
                            // let keepMetrics = 576 //48H // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
                            let keepMetrics = 2016 //7 days (1 week) // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
                            // let keepMetrics = 8640 //30 days (1 Month) // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
                            // let keepMetrics = 25920 //90 days (3 Months) // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
    
                            let resHostMetrics: any = await sshHostMetrics(host, port, username, password);
                            // console.log(resHostMetrics);
                            item.hostMetrics = item.hostMetrics || [{
                                "diskStatus":[],
                                "memStatus":[],
                                "cpuStatus":[],
                                "DiskTotal": Number,
                                "DiskUsage": Number,
                                "DiskFree": Number,
                                "MemTotal": Number,
                                "MemUsage": Number,
                                "MemFree": Number,
                                "CpuTotal": Number,
                                "CpuUsage": Number,
                                "CpuFree": Number,
                                "CPU": Number,
                                "uptime": String
                            }];
    
                            // Keep Array size fix and remove fist item
                            for (let arrayItem = 0; arrayItem < item.hostMetrics[0].diskStatus.length; arrayItem++) {
                                if (item.hostMetrics[0].diskStatus.length >= (keepMetrics)) {
                                    // console.log(item.hostMetrics[0].diskStatus.splice(1, 1));
                                    item.hostMetrics[0].diskStatus.splice(0, 1);
                                }
                            }
                            for (let arrayItem = 0; arrayItem < item.hostMetrics[0].memStatus.length; arrayItem++) {
                                if (item.hostMetrics[0].memStatus.length >= (keepMetrics)) {
                                    item.hostMetrics[0].memStatus.splice(0, 1);
                                }
                            }
                            for (let arrayItem = 0; arrayItem < item.hostMetrics[0].cpuStatus.length; arrayItem++) {
                                if (item.hostMetrics[0].cpuStatus.length >= (keepMetrics)) {
                                    item.hostMetrics[0].cpuStatus.splice(0, 1);
                                }
                            }
    
                            item.hostMetrics[0].diskStatus.push(resHostMetrics.diskStatus);
                            item.hostMetrics[0].memStatus.push(resHostMetrics.memStatus);
                            item.hostMetrics[0].cpuStatus.push(resHostMetrics.cpuStatus);
                            item.hostMetrics[0].DiskTotal = resHostMetrics.DiskTotal;
                            item.hostMetrics[0].DiskUsage = resHostMetrics.DiskUsage;
                            item.hostMetrics[0].DiskFree = resHostMetrics.DiskFree;
                            item.hostMetrics[0].MemTotal = resHostMetrics.MemTotal;
                            item.hostMetrics[0].MemUsage = resHostMetrics.MemUsage;
                            item.hostMetrics[0].MemFree = resHostMetrics.MemFree;
                            item.hostMetrics[0].CpuTotal = resHostMetrics.CpuTotal;
                            item.hostMetrics[0].CpuUsage = resHostMetrics.CpuUsage;
                            item.hostMetrics[0].CpuFree = resHostMetrics.CpuFree;
                            item.hostMetrics[0].CPU = resHostMetrics.CPU;
                            item.hostMetrics[0].uptime = resHostMetrics.uptime;
                            let metricsData = item.hostMetrics
                            await owlModel.serviceHost.findOneAndUpdate({_id: item._id}, {$set: {hostMetrics: metricsData}}).exec();
                            // console.log(metricsData);
                            resolve();
                        }));
                    }
                }
                for (let i = 0; i < item.port.length; i++) {
                    portsPromiseArr.push(new Promise<void>(async (resolve, reject) => {
                        let portObj = item.port[i];
                        let isUp;
                        let isHttpUp;
                        let httpCheck = {
                            hostname: item.ipAddress,
                            port: portObj.port,
                            path: portObj.path,
                            method: portObj.method,
                            timeout: 10000
                        };

                        try {
                            if (portObj.http) {
                                const __ret = await setHttpStatus(portObj, httpCheck, isHttpUp, item);
                                isHttpUp = __ret.isHttpUp;
                                if (isHttpUp) {
                                    portObj.status = 'UP'
                                } else {
                                    console.log(`Http Watching: '${item.ipAddress}' Port '${portObj.port}'.`);
                                    for (let index = 0; index < 23; index++) {
                                        const __ret = await setHttpStatus(portObj, httpCheck, isHttpUp, item);
                                        isHttpUp = __ret.isHttpUp;
                                        if (isHttpUp) {
                                            break;
                                        }
                                    }
                                    if (isHttpUp) {
                                        portObj.status = 'UP'
                                        console.log(`Http Checker: UP Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                    } else {
                                        portObj.status = 'DOWN'
                                        console.log(`Http Checker: DOWN Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                    }
                                }
                            } else {
                                try {
                                    isUp = await tcpPortUsed.check(portObj.port, item.ipAddress);
                                    portObj.status = 'UP'
                                } catch (error) {
                                    try {
                                        console.log(`Port Watching: '${item.ipAddress}' Port '${portObj.port}'.`);
                                        await tcpPortUsed.waitUntilUsedOnHost(portObj.port, item.ipAddress, 10000, 60000 * 4); // wait for 5 minute to
                                        portObj.status = 'UP'
                                        console.log(`Port Checker: UP Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                    } catch (error) {
                                        portObj.status = 'DOWN'
                                        console.log(`Port Checker: DOWN Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                    }
                                }
                            }
                            if (portObj.status === 'UP') {
                                upCount++;
                            } else {
                                downCount++;
                            }
                        } catch (error) {
                            console.log(error)
                        }
                        resolve();
                    }));
                }
                await Promise.all(portsPromiseArr);
                await owlModel.serviceHost.findOneAndUpdate({_id: item._id}, {$set: {port: item.port}}).exec();

                if (upCount === item.port.length) await owlModel.serviceHost.findOneAndUpdate({_id: item._id}, {$set: {status: 'UP'}}).exec();
                else if (downCount === item.port.length) await owlModel.serviceHost.findOneAndUpdate({_id: item._id}, {$set: {status: 'DOWN'}}).exec();
                else if (upCount !== item.port.length && downCount !== item.port.length) await owlModel.serviceHost.findOneAndUpdate({_id: item._id}, {$set: {status: 'S_DOWN'}}).exec();
                resolve();
            }));
        }else {
            console.log(`Skip Host '${item.hostName}' '${item.ipAddress}' HostCheck is '${item.hostCheck}'.`);
        }
    }
    await Promise.all(servicesPromiseArr);
    await compareStatus();

    let endDate = new Date().getTime();
    console.log(`${moment().format('DD-MM-YYYY hh:mm:ss A Z')} : Data Refreshed in ${(endDate - startDate) / 1000}`);
    isOwlChekcing = false;
    console.log(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Stop =>`, counter++,`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
}
// setTimeout(allServiceHost(), 10000);
setInterval(allServiceHost, 60000 * 5);
allServiceHost();


app.get('/', (req, res) => {
    res.send(`Service-Owl is up and running...`);
})

app.get('/hosts', async (req, res) => {
    try {
        // let hosts = await owlModel.serviceHost.find({}).sort({_id:-1});
        let hosts = await owlModel.serviceHost.find({}).select('ipAddress hostName port hostMetrics.DiskFree hostMetrics.MemFree hostMetrics.CpuUsage linkTo userName userPass groupName clusterName envName vmName note status hostCheck metricsCheck createdAt updatedAt').sort({_id:-1});
        res.send({data: getEncryptedData(hosts)});
    } catch (e) {
        res.status(500);
    }
});

app.get('/hosts/hostMetrics/:postId', async (req: any, res) => {
    try {
        let hostData = await owlModel.serviceHost.findOne({_id: req.params.postId});
        let hostMetrics = hostData.hostMetrics[0];
        if(hostMetrics === undefined){
            hostMetrics = {
                "diskStatus": [['Timestamp', 'Disk Total', 'Disk Usage', 'Disk Free'], [0, 0, 0, 0]],
                "memStatus": [['Timestamp', 'Mem Total', 'Mem Usage', 'Mem Available'], [0, 0, 0, 0]],
                "cpuStatus": [['Timestamp', 'CPU Total', 'CPU Usage', 'CPU Free'], [0, 0, 0, 0]],
                "DiskTotal": 0,
                "DiskUsage": 0,
                "DiskFree": 0,
                "MemTotal": 0,
                "MemUsage": 0,
                "MemFree": 0,
                "CpuTotal": 0,
                "CpuUsage": 0,
                "CpuFree": 0,
                "CPU": 0,
                "uptime": `ssh: connect to host port : Connection refused`
                };
        }
        // console.log(hostMetrics)
        res.send({data: getEncryptedData(hostMetrics)});
    } catch (e) {
        res.status(500);
    }
});

app.get('/hosts/speedTest', async (req: any, res) => {
    try {
        let speedData = await owlModel.speedTest.find({});
        let speedMetrics = speedData[0];
        res.send({data: getEncryptedData(speedMetrics)});
    } catch (e) {
        res.status(500);
    }
});

//update internetCheck 
app.get('/hosts/speedTest/:Id/:Data', async (req: any, res) => {
    try {
        let internetCheckData = req.params.Data
        let id = req.params.Id
        let post = await owlModel.speedTest.findByIdAndUpdate(id, {internetCheck: internetCheckData}, {new: true, runValidator: true});
        // res.send(getEncryptedData(post));
        res.send({"Internet_Check": internetCheckData});
        let doUpdate = async() => {
            if (isOwlChekcing) {
                setTimeout(doUpdate, 1000);
            } else {
                await owlModel.serviceHost.findByIdAndUpdate(id, {internetCheck: internetCheckData}, {new: true, runValidator: true});
            }
           }
        doUpdate();
    } catch (e) {
        res.status(500);
    }
});

// app.get('/hosts/latestPull', async (req, res) => {
//     try {
//         let latestPull = allServiceHost();
//         res.send(latestPull);
//     } catch (e) {
//         res.status(500);
//     }
// });

//post
app.post('/hosts/host-save', async (req: any, res) => {
    try {
        let tempData = JSON.parse(getDecryptedData(req.body.data));
        let saved = await owlModel.create(tempData);
        res.send(saved);
    } catch (e) {
        console.log(e);
        res.status(500);
        res.send({message: e.message});
    }
});

//get byId
app.get('/hosts/:postId', async (req: any, res) => {
    try {
        let post = await owlModel.serviceHost.findOne({_id: req.params.postId});
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});

//update
app.put('/hosts/update', async (req: any, res) => {
    try {
        let tempData = JSON.parse(getDecryptedData(req.body.data));
        let id = getDecryptedData(req.body.id);
        let post = await owlModel.serviceHost.findByIdAndUpdate({_id: id}, tempData, {new: true, runValidator: true});
        res.send(post);
        let doUpdate = async() => {
            if (isOwlChekcing) {
                setTimeout(doUpdate, 1000);
            } else {
                await owlModel.serviceHost.findByIdAndUpdate({_id: id}, tempData, {new: true, runValidator: true});
            }
           }
        doUpdate();
    } catch (e) {
        res.status(500);
    }
});

//delete
app.post('/hosts/host-delete', async (req: any, res) => {
    try {
        let post = await owlModel.serviceHost.findByIdAndRemove({
            _id: getDecryptedData(req.body.data)
        });
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});


let localStorageData: Idashboard[];

async function compareStatus() {
    let res: Idashboard[] = JSON.parse(JSON.stringify(await owlModel.serviceHost.find({}).lean().exec()));
    let oldDashboard = localStorageData
    let downHostServices: any = [];
    if (oldDashboard && oldDashboard.length) {
        let oldStorageMap = getRowsMap(oldDashboard, '_id');
        let changeFound = false;
        let downServices: any = [];
        for (let item of res) {
            let oldItem: Idashboard = oldStorageMap[item._id];
            if (!oldItem) continue;
            let downPortsList: IPort[] = comparePortsArrAndGetDownServices(oldItem.port, item.port);
            if (downPortsList.length) {
                changeFound = true;
                console.log('Change found in ', item.hostName, " => ", item.ipAddress);
                downServices.push({hostname: item.hostName, host: item.ipAddress, ports: downPortsList});
                // break;
            }
        }
        downServices.forEach(element => {
            downHostServices.push([element.hostname, " => ",element.host]);
            for (let index = 0; index < element.ports.length; index++) {
                downHostServices.push([element.ports[index].name, element.ports[index].port, element.ports[index].status])
            }
            downHostServices.push(["***************", "*****", "***************"]);
        });
        const tableConfig: any = {
            // border: getBorderCharacters('honeywell'),
            columns: [
              { alignment: 'center'},
              { alignment: 'center'},
              { alignment: 'center'}
            ],
            drawVerticalLine: () => false
        };
        if (changeFound) {
            async function main() {
                // Create a SMTP transporter object
                let transporter = nodemailer.createTransport({
                    host: "192.168.130.80",
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'spatel@operrparking.com',
                        pass: '123@Soon'
                    },
                    tls: {
                        rejectUnauthorized: false
                    },
                    dkim: {
                        domainName: "operrparking.com",
                        keySelector: "dkim",
                        privateKey: '"-----BEGIN RSA PRIVATE KEY-----","MIIEogIBAAKCAQEAxp\/KVTc+tJKt+I2Zrh+tBUeBMfIRTIwGCj2nKi5xzMsphWGQ","fJAg6luD9VUGTx4l304yGF\/5saKgTi8wLJrM7jNrm3a+J8lBpsYDvaxL\/77k4WW3","E9TYBnPgzN3K39cfce+pFOPgOC2FZkwsiiAvE9acV28soHh6H0TEvfcLVYIkP8Np","bQ2adXekMfcnJcAOvnue1aycyWjBNOwCippDVkScdV9Kl3vhZamc1Wa2IncStE6L","v9BNYR5lShZCNODogSzq3rQWBojpSKxQaoGVE5hmMzNl4nkaSo1oK4DX7uW0BTVN","vQQ1alPJBRzvMQ4Ua\/r\/fFnq+oeux42P\/PRGewIDAQABAoIBAF1GwyU7uXXhgFO+","Y9Jyy7Uz\/EcxT9Br3ZZHl85mW0j6i7g4tjrZEKweaBz5Xeof1VdGCJ6Ly94Q6klt","Palk1SJ0AW\/T1r8mc29XhIA5fsNOqXv0YYKtrPlyx7pN2i0+gGToULYfwbeAISqG","UVBYhuNBINCqxAFkMq2mhOJVNvxjOsmVa3sOw2QBjfsFBE4SWwprwOqQYMIGrHYC","nlB0Mt7KNNjhR0LMnITA60sCADxHZsSsh0PH2VfyR2eMJK2jN6nRge44WaYjWJe4","ZQK5UiRp2s3rzoE3XBtsAGArVhGJ2Fhe78kEdmFfAEuzn\/F24sWcaqcjRh0+fwws","4glqsikCgYEA4cTyuwccf1uJ+6bvKbKxhGpHQLA4Oego0k4FPrpYWXtLKmPl+rcz","0Xz9rbZs02mBltyXGistCdnhAxFR\/389Cd31ouk1gzg8HOr09YF5P744ZW3YGC8N","DTfJHh7N49inCdMeP8bGABNPksigbNU2GMCGWZdoiRVrJnIg2MagEV0CgYEA4ThY","WHyqDxeXayK1SE9PLYUIR7O0dNOYsqIR9QFFRW9\/iHv5p\/IELVfHSo9ugkYsx+A9","bc09d+ICAfGJMXwn7jM2yLsKzldhB5joESVq8XIwMJ4Kip74MDffO4zScWwLbXLA","RcigJfhFvBcjwHnhi\/TLArWKMD25rADqVtJogbcCgYBjqG1BE52Htl+NPx35ORDV","E5jKPD9FiG5kjt4P12\/iZ+NBHgHJjw8HnPXZtVoKZFs4vbzRZ1elLpD9qqqYbpEC","BwFD3U+q0arvVOO2b2WXNp9sXnVyD2rid8qGSjC2L89kLdX\/bv290MhiUb9G60LK","4EktyQDy6gp3WQ+YwOytXQKBgAXzu0H7aXMkqHfIXwoeLnWBgoqCkU5VGT\/\/UIIt","GmuPWst8m0h4+OtJ2pZ52+3NdPmDT5xLREiazHrIq1uHcHa3G8eKSerSHFpbDCcH","2h+vaN6gDp9DPEPp9hhYzGb6+AJYegReHP1j5lPmOKepkPBl88eKjLBhsTp+e7L3","tJNZAoGAHbuHB3C0AfoZrT39JPcI+GtM72lPIsiIJqBwIeUAJz7PAiI\/Gv+sMAn\/","l6Riqa+Cx6lAIsXNJQEzNfUVgAt5XutxnokDuwiCRZgmhOSfXmQ2t6359XgERwNC","5lfKsqhl02NJPIWE7Id6iRqQHs6BGX3XJ105RfggRbSmpl0f\/a8=","-----END RSA PRIVATE KEY-----"'
                    }
                });

                // Message object
                let message = {
                    from: 'ServiceOwl <spatel@operrparking.com>',

                    // Comma separated list of recipients
                    to: 'spatel.devops@gmail.com',

                    // bcc: 'andris@ethereal.email',

                    // Subject of the message
                    subject: 'Service is down, Please check the mail for more details.',

                    // plaintext body
                    // text: JSON.stringify(downServices, null, 4),
                    text: table(downHostServices, tableConfig),

                    // HTML body
                    // html:
                    //     '<p><b>Hello</b> to myself <img src="cid:note@example.com"/></p>' +
                    //     '<p>Here\'s a nyan cat for you as an embedded attachment:<br/><img src="cid:nyan@example.com"/></p>',

                    // An array of attachments
                    attachments: [
                        // String attachment
                    ]
                };

                let info = await transporter.sendMail(message);
                console.log('Down Services => Message sent successfully as %s', info.messageId);
                console.log(table(downHostServices));
            }

            main().catch(err => {
                console.error(err.message);
                process.exit(1);
            });
        } else console.log('No change found');
        localStorageData = getDashboardToStore(res);
    } else localStorageData = getDashboardToStore(res);
}

function comparePortsArrAndGetDownServices(oldPorts: IPort[], newPorts: IPort[]): IPort[] {
    let oldPortsMap = getRowsMap(oldPorts, 'port');
    let downPorts: IPort[] = [];
    for (let port of newPorts) {
        let oldPort: IPort = oldPortsMap[port.port];
        if (oldPort) {
            if (oldPort.status !== port.status && (port.status === EStatus.DOWN || port.status === EStatus.S_DOWN)) {
                console.log('Port status changed : ', oldPort.status);
                downPorts.push(port);
            }
        }
    }
    return downPorts;
}

function getDashboardToStore(rows: Idashboard[]): Idashboard[] {
    let arr: Idashboard[] = [];
    for (let row of rows) {
        arr.push(<any><Partial<Idashboard>>{
            _id: row._id,
            port: row.port,
        });
    }
    return arr;
}

function getRowsMap(rows: any[], key: string) {
    let obj: any = {};
    for (let row of rows) obj[row[key]] = row;
    return obj;
}

async function setHttpStatus(portObj, httpCheck: { path: string; hostname: string; method: string; port: any; timeout: number }, isHttpUp, item): Promise<any> {
    return new Promise(async (resolve, reject) => {
        try {
            let isResolveCalled = false;
            let req = http.request(httpCheck, (res) => {
                // console.log(res.statusCode);
                // portObj.statuscode = res.statusCode;
                isHttpUp = true;
                isResolveCalled = true;
                resolve({isHttpUp});
            });
            req.on('timeout', function () {
                // console.log("timeout! " + (httpCheck.timeout / 1000) + " seconds => Req expired: " + item.ipAddress + " Port: " + portObj.port);
                req.destroy();
                if (!isResolveCalled) {
                    isResolveCalled = true;
                    resolve({isHttpUp: false});
                }
            });
            req.on('error', (error: any) => {
                if (error) {
                    // console.error(`Error Http Requst => Errno: ${error.errno} Code: ${error.code} Syscall: ${error.syscall} Hostname: ${error.address} Port: ${error.port}`);
                    setTimeout(function() {
                        if (!isResolveCalled) {
                            isResolveCalled = true;
                            resolve({isHttpUp: false});
                        }
                    },10000);
                } else {
                    setTimeout(function() {
                        if (!isResolveCalled) {
                            isResolveCalled = true;
                            resolve({isHttpUp: false});
                        }
                    },10000);
                }
            });
            req.end();
        } catch (e) {
            setTimeout(function() {
                resolve({isHttpUp: false});
            },10000);
        }
    });

}

function toIsoString(date: any) {
    var tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function(num) {
            return (num < 10 ? '0' : '') + num;
        };
  
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds())
        // dif + pad(Math.floor(Math.abs(tzo) / 60)) +
        // ':' + pad(Math.abs(tzo) % 60);
  }

async function sshHostMetrics(host: string, port: number, username: string, password: string) {

    let metricsArr: string[] = ["DiskTotal", "DiskFree", "MemTotal", "MemFree", "CpuUsage", "CPU", "uptime"];
    let metricsCom: any = {
        DiskTotal: "df / | grep / | awk '{ print $2}'",
        DiskFree: "df / | grep / | awk '{ print $4}'",
        MemTotal: "cat /proc/meminfo | grep MemTotal | awk '{ print $2}'",
        MemFree: "cat /proc/meminfo | grep MemFree | awk '{ print $2}'",
        CpuUsage: "top -bn2|grep '%Cpu'|tail -1|grep -P '(....|...) id,'|awk '{print 100-$8}'",
        CPU: "lscpu | grep 'CPU(s):' | awk 'FNR == 1 {print $2}'",
        uptime: "uptime -p | awk '{ print $2,$3,$4,$5 }'"
    }
    let count = metricsArr.length - 1;

    let hostMetrics: any = {
        "diskStatus": [],
        "memStatus": [],
        "cpuStatus": [],
        "DiskTotal": Number,
        "DiskUsage": Number,
        "DiskFree": Number,
        "MemTotal": Number,
        "MemUsage": Number,
        "MemFree": Number,
        "CpuTotal": Number,
        "CpuUsage": Number,
        "CpuFree": Number,
        "CPU": Number,
        "uptime": String
    };
    let dt = new Date();
    let createdAt = toIsoString(dt); // ISO 8601 Date will saved to DB
    let resData: any = {};
    let sshConnected: boolean = false;
    for (let k of metricsArr) {
        sshConnected = true;
        let resDataPromiseArr: any = [];
        resDataPromiseArr.push(
            new Promise(async (resolve: any, reject: any) => {
                if (k in metricsCom) {
                    let conn = new Client();
                    conn.on('ready', async () => {
                        conn.exec(`${metricsCom[k]}`, (err, stream) => {
                            if (err) throw err;
                            stream.on('close', () => {
                                // console.log(resData);
                                resolve();
                                conn.end();
                                if (count === metricsArr.indexOf(k)) {
                                    // console.log(resData);
                                    let DiskTotal = ((resData.DiskTotal / 1024) / 1024).toFixed(1);
                                    let DiskFree = ((resData.DiskFree / 1024) / 1024).toFixed(1);
                                    let DiskUsage = (+DiskTotal - +DiskFree).toFixed(1);
                                    let MemTotal = ((resData.MemTotal / 1024) / 1024).toFixed(1);
                                    let MemFree = ((resData.MemFree / 1024) / 1024).toFixed(1);
                                    let MemUsage = (+MemTotal - +MemFree).toFixed(1);
                                    let CpuTotal = 100;
                                    let CpuUsage = resData.CpuUsage;
                                    let CpuFree = (CpuTotal - +CpuUsage).toFixed(1);
                                    let CPU = resData.CPU;
                                    let uptime = resData.uptime;
                                    // let createdAt = new Date(); // ISO 8601 Date will saved to DB
                                    // let dt = new Date();
                                    // let createdAt = toIsoString(dt); // ISO 8601 Date will saved to DB

                                    hostMetrics = {
                                        "diskStatus": [createdAt, +DiskTotal, +DiskUsage, +DiskFree],
                                        "memStatus": [createdAt, +MemTotal, +MemUsage, +MemFree],
                                        "cpuStatus": [createdAt, CpuTotal, +CpuUsage, +CpuFree],
                                        "DiskTotal": (+DiskTotal).toFixed(0),
                                        "DiskUsage": (+DiskUsage).toFixed(0),
                                        "DiskFree": (+DiskFree).toFixed(0),
                                        "MemTotal": (+MemTotal).toFixed(1),
                                        "MemUsage": (+MemUsage).toFixed(1),
                                        "MemFree": (+MemFree).toFixed(1),
                                        "CpuTotal": (+CpuTotal).toFixed(0),
                                        "CpuUsage": (+CpuUsage).toFixed(0),
                                        "CpuFree": (+CpuFree).toFixed(0),
                                        "CPU": CPU,
                                        "uptime": uptime
                                    };

                                }
                            }).on('data', async (data) => {
                                let output = await JSON.parse(JSON.stringify('' + data));
                                // resData[k] = await output.replace(/(\r\n|\n|\r)/gm, "");
                                resData[k] = await output.replace(/\n/g, '');
                            });
                        });
                    }).on('error', async(err: any) => {
                        console.log(err);
                        console.log(`Error: => ssh: connect to host ${host} port ${port}: Connection refused`)
                        hostMetrics = {
                            "diskStatus": [createdAt, 0, 0, 0],
                            "memStatus": [createdAt, 0, 0, 0],
                            "cpuStatus": [createdAt, 0, 0, 0],
                            "DiskTotal": 0,
                            "DiskUsage": 0,
                            "DiskFree": 0,
                            "MemTotal": 0,
                            "MemUsage": 0,
                            "MemFree": 0,
                            "CpuTotal": 0,
                            "CpuUsage": 0,
                            "CpuFree": 0,
                            "CPU": 0,
                            "uptime": `ssh: connect to host ${host} port ${port}: Connection refused`
                        };
                        sshConnected = false;
                        resolve();
                    }).connect({
                        host: host,
                        port: port,
                        username: username,
                        password: password
                    });
                }
            })
        );
        await Promise.all(resDataPromiseArr);
        if (!sshConnected) {
            break;
        }
    }
    // console.log(await hostMetrics);
    return await hostMetrics;
}

async function speedTest() {
    let keepMetrics = 2016 //7 days (1 week) // It will keep last Metrics record. Every 5 min new Metrics array added and old one is remove.
    let dt = new Date();
    let createdAt = toIsoString(dt); // ISO 8601 Date will saved to DB
    let speedTestData: Ispeedtest[] = <any>await owlModel.speedTest.find({});
    let speedtest: any = [];
    let data:any = [];
    let resDataPromiseArr: any = [];
    resDataPromiseArr.push(
        new Promise(async (resolve: any, reject: any) => {
            if (!speedTestData[0]){
                console.log("Create new Data")
                await owlModel.speedTest.create({speedTest: [], internetCheck: true})
            }
            else{
                speedTestData = JSON.parse(JSON.stringify(speedTestData));
                if (speedTestData[0].internetCheck) {
                    // console.log(speedTestData[0])
                    // Keep Array size fix and remove fist item
                    for (let arrayItem = 0; arrayItem < speedTestData[0].speedTest.length; arrayItem++) {
                        if (speedTestData[0].speedTest.length >= (keepMetrics)) {
                            // console.log(item.speedTest.splice(0, 1));
                            speedTestData[0].speedTest.splice(0, 1);
                        }
                    }
                    exec('fast --upload --json', (error, stdout, stderr) => {
                        if (error) {
                          console.error(`exec error: ${error}`);
                          data.push(createdAt,0,0,0)
                          return;
                        }
                        speedtest.push(stdout);
                        // console.log(stdout)
                        speedtest.forEach(element => {
                            // console.log(element)
                            try {
                                let tempData = JSON.parse(element);
                                data.push(createdAt)
                                data.push(parseFloat(tempData.latency))
                                data.push(parseFloat(tempData.downloadSpeed))
                                data.push(parseFloat(tempData.uploadSpeed))
                                speedTestData[0].speedTest.push(data);
                                let speedData = speedTestData[0].speedTest
                                // console.log(speedData)
                                owlModel.speedTest.findOneAndUpdate({_id: speedTestData[0]._id}, {$set: {speedTest: speedData}}).exec();
                                resolve()
                            } catch (error) {
                                data.push(createdAt,0,0,0)
                                speedTestData[0].speedTest.push(data);
                                let speedData = speedTestData[0].speedTest
                                // console.log(speedData)
                                owlModel.speedTest.findOneAndUpdate({_id: speedTestData[0]._id}, {$set: {speedTest: speedData}}).exec();
                                resolve()
                            }
                        });
                        if (stderr!= "") {
                            data.push(createdAt,0,0,0)
                            console.error(`stderr: ${stderr}`);
                            resolve()
                        }
                    });
                }
            }
        })
    )
    await Promise.all(resDataPromiseArr);
}
setInterval(speedTest, 60000 * 5);
speedTest();

module.exports = app;
function resolve(servicesPromiseArr: Promise<any>[]) {
    throw new Error('Function not implemented.');
}

