import {Idashboard, IPort} from './interfaces/Idashboard';
import {EStatus} from './interfaces/enums/EStatus';

const fastify = require('fastify')({
    // logger: true
})

let app = fastify;
app.register(require('fastify-cors'), {
    // put your options here
});
const portUsed = require('port-used');
const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const boom = require('boom');
const bodyParser = require('body-parser');
const hostname = '0.0.0.0';
const port = 8002;
let owlModel = require('./owl.model');
let db = 'mongodb://127.0.0.1:27017/service-owl';
let allData = [];
let nodemailer = require('nodemailer');
// const fs = require('fs')
mongoose.Promise = global.Promise;

mongoose.connect(db, {
    promiseLibrary: Promise,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log(`MongoDB Connected: ${db}`));


app.listen(port, function () {
    console.log(`service-owl app listen at : http://${hostname}:${port}`)
})

const allServiceHost = async () => {
    let allData = await owlModel.find({}).select('ipAddress port').exec();
    for (let item of allData) {
        let upCount = 0;
        let downCount = 0;
        for (let i = 0; i < item.port.length; i++) {
            let portObj = item.port[i];
            let isUp = await portUsed.check({
                port: item.port[i].port,
                host: item.ipAddress,
                timeout: 400,
            });
            if (isUp === true) {
                upCount++;
                portObj.status = 'UP';
            } else {
                downCount++;
                portObj.status = 'DOWN';
            }
        }
        await owlModel.findOneAndUpdate({_id: item._id}, {$set: {port: item.port}}).exec();

        if (upCount === item.port.length) {
            console.log('UP');
            await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'UP'}}).exec();
        } else if (downCount === item.port.length) {
            console.log('DOWN');
            await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'DOWN'}}).exec();
            // } else if ((upCount && downCount) !== item.port.length) {
        } else if (upCount !== item.port.length && downCount !== item.port.length) {
            console.log('S_DOWN');
            await owlModel.findOneAndUpdate({_id: item._id}, {$set: {status: 'S_DOWN'}}).exec();
        }
    }
    console.log(`################`);
    await compareStatus();
}
// setTimeout(allServiceHost(), 10000);
setInterval(allServiceHost, 60000);


app.get('/', (req, res) => {
    // console.log(`service-owl is up and running...`)
    res.send(`service-owl is up and running...`)
    // res.type(`${__dirname}/index.html`)
    // throw boom.boomify(Error)
})

//get

app.get('/hosts', async (req, res) => {
    try {
        let hosts = await owlModel.find({});
        res.send(hosts);
    } catch (e) {
        res.status(500);
    }
});

app.get('/hosts/latestPull', async (req, res) => {
    try {
        let latestPull = allServiceHost();
        res.send(latestPull);
    } catch (e) {
        res.status(500);
    }
});

//post
app.post('/hosts', async (req, res) => {
    try {
        let saved = await owlModel.create(req.body);
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
app.put('/hosts/:postId', async (req, res) => {
    try {
        let post = await owlModel.findByIdAndUpdate({
            _id: req.params.postId
        }, req.body, {
            new: true,
            runValidator: true
        });
        res.send(post);
    } catch (e) {
        res.status(500);
    }
});


//delete
app.delete('/hosts/:postId', async (req, res) => {
    try {
        let post = await owlModel.findByIdAndRemove({
            _id: req.params.postId
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
        let downHosts: any;
        let oldStorageObj: Idashboard[] = oldDashboard;
        let oldStorageMap = getRowsMap(oldStorageObj, '_id');
        let changeFound = false;
        let downServices = [];
        for (let item of res) {
            let oldItem: Idashboard = oldStorageMap[item._id];
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

            transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + mailOptions.to, info.response);
                }
            });
            // console.log('Down services : ', JSON.stringify(downServices, null, 4));
        } else console.log('No change found');
        localStorageData = getDashboardToStore(res);
    } else {
        localStorageData = getDashboardToStore(res);
    }
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
