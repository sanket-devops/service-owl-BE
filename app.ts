import {Idashboard, IPort} from './interfaces/Idashboard';
import {EStatus} from './interfaces/enums/EStatus';
import * as moment from 'moment';

const CryptoJS = require('crypto-js');
let k = `j@mesbond`; // j@mesbond

const fastify = require('fastify')({
    // logger: true
})

let app = fastify;
app.register(require('fastify-cors'), {
    // put your options here
});
const tcpPortUsed = require('tcp-port-used');
const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const boom = require('boom');
const bodyParser = require('body-parser');
const hostname = '0.0.0.0';
const port = 8002;
let owlModel = require('./owl.model');
let db = 'mongodb://service-owl:ecivreS8002lwO@192.168.120.135:27017/service-owl?authSource=admin';
// let db = 'mongodb://localhost:27017/service-owl?authSource=admin';
let allData = [];
let nodemailer = require('nodemailer');

mongoose.Promise = global.Promise;

mongoose.connect(db, {
    promiseLibrary: Promise,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log(`MongoDB Connected: ${db}`)).catch(console.error);


app.listen(port, '0.0.0.0', function () {
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
const allServiceHost = async () => {
    console.log(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Start =>`, counter,`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    let startDate = new Date().getTime();
    let allData: Idashboard[] = <any>await owlModel.find({}).select('ipAddress hostName port hostCheck').lean().exec();
    allData = JSON.parse(JSON.stringify(allData));
    let servicesPromiseArr: Promise<any>[] = [];

    // loop services
    for (let item of allData) {
        if (item.hostCheck === true) {
            servicesPromiseArr.push(new Promise<void>(async (resolve, reject) => {
                let upCount = 0;

                let downCount = 0;
                let portsPromiseArr: Promise<any>[] = [];
                for (let i = 0; i < item.port.length; i++) {
                    portsPromiseArr.push(new Promise<void>(async (resolve, reject) => {
                        let portObj = item.port[i];
                        let isUp;
                        try {
                            isUp = await tcpPortUsed.waitUntilUsedOnHost(portObj.port, item.ipAddress, 2000, 10000);
                        } catch (e) {
                        }
                        // isUp = await checkStatus();
                        if (isUp === true) {
                            upCount++;
                            portObj.status = 'UP';
                        } else {
                            try {
                                console.log(`Watching '${item.ipAddress}' Port '${portObj.port}'.`);
                                await tcpPortUsed.waitUntilUsedOnHost(portObj.port, item.ipAddress, 20000, 60000 * 4); // wait for 5 minute to
                                console.log(`Up Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                upCount++;
                                portObj.status = 'UP';
                            } catch (e) {
                                console.log(`Down Found '${item.ipAddress}' Port '${portObj.port}'.`);
                                downCount++;
                                portObj.status = 'DOWN';
                            }
                        }
                        resolve();
                    }));
                }
                await Promise.all(portsPromiseArr);
                await owlModel.findOneAndUpdate({_id: item._id}, {$set: {port: item.port}}).exec();

                if (upCount === item.port.length) await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'UP'}}).exec();
                else if (downCount === item.port.length) await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'DOWN'}}).exec();
                else if (upCount !== item.port.length && downCount !== item.port.length) await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'S_DOWN'}}).exec();
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
    console.log(`<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< Stop =>`, counter++,`>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
}
// setTimeout(allServiceHost(), 10000);
setInterval(allServiceHost, 60000 * 5);
allServiceHost();


app.get('/', (req, res) => {
    res.send(`service-owl is up and running...`);
})

app.get('/hosts', async (req, res) => {
    try {
        let hosts = await owlModel.find({});
        res.send({data: getEncryptedData(hosts)});
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
app.post('/hosts/host-save', async (req, res) => {
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
app.get('/hosts/:postId', async (req, res) => {
    try {
        let post = await owlModel.findOne({_id: req.params.postId});
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});

//update
app.put('/hosts/update', async (req, res) => {
    try {
        let tempData = JSON.parse(getDecryptedData(req.body.data));
        let id = getDecryptedData(req.body.id);
        let post = await owlModel.findByIdAndUpdate({_id: id}, tempData, {new: true, runValidator: true});
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});

//delete
app.post('/hosts/host-delete', async (req, res) => {
    try {
        let post = await owlModel.findByIdAndRemove({
            _id: getDecryptedData(req.body.data)
        });
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});


let localStorageData: Idashboard[];

async function compareStatus() {
    let res: Idashboard[] = JSON.parse(JSON.stringify(await owlModel.find({}).lean().exec()));
    let oldDashboard = localStorageData
    if (oldDashboard && oldDashboard.length) {
        let oldStorageMap = getRowsMap(oldDashboard, '_id');
        let changeFound = false;
        let downServices = [];
        for (let item of res) {
            let oldItem: Idashboard = oldStorageMap[item._id];
            if (!oldItem) continue;
            let downPortsList: IPort[] = comparePortsArrAndGetDownServices(oldItem.port, item.port);
            if (downPortsList.length) {
                changeFound = true;
                console.log('Change found in ', item.hostName);
                downServices.push({host: item.hostName, ports: downPortsList});
                // break;
            }
        }
        if (changeFound) {
            let transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: 'spatel.devops@gmail.com',
                    pass: 'Operr123'
                }
            });

            let mailOptions = {
                from: 'spatel.devops@gmail.com',
                to: 'spatel.devops@gmail.com',
                subject: 'Service is down, Please check the mail for more details.',
                text: JSON.stringify(downServices, null, 4)
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) console.log(error);
                else console.log('Email sent: ' + mailOptions.to, info.response);
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

module.exports = app;
