var db = require('../config/connection');
var collection = require('../config/collection');
require('dotenv').config();
const bcrypt = require('bcrypt');
var objectId = require('mongodb').ObjectId;
require('dotenv').config()
var unirest = require('unirest');

module.exports = {
    DoStudentLogin: (studentData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.STUDENT_COLLECTION).findOne({ username: studentData.username })
            if (user) {
                if (studentData.password === user.password) {
                    console.log(' student login sucsess')
                    response.student = user
                    response.status = true
                    resolve(response)
                } else {
                    console.log('login failed');
                    resolve({ status: false })
                }

            } else {
                console.log('failed');
                resolve({ status: false })
            }
        })
    },
    checkMobileNumber: (number) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION).findOne({ mobile: number }).then((number) => {
                resolve(number)
            })
        })
    },

    sendOtp: (phone) => {
        return new Promise((resolve, reject) => {
            var req = unirest('POST', 'https://d7networks.com/api/verifier/send')
                .headers({
                    'Authorization': `Token ${process.env.Token}`
                })
                .field('mobile', '91' + phone)
                .field('sender_id', 'SMSINFO')
                .field('message', 'Your otp for ECLASS activation is {code}')
                .field('expiry', '900')
                .end(function (res) {
                    console.log('hi', res.body.otp_id);
                    resolve(res.body.otp_id)
                });
        })

    },

    verifyOtp: (otp, otp_id) => {
        return new Promise((resolve, reject) => {
            var req = unirest('POST', 'https://d7networks.com/api/verifier/verify')
                .headers({
                    'Authorization': `Token ${process.env.Token}`
                })
                .field('otp_id', otp_id)
                .field('otp_code', otp)
                .end(function (res) {

                    console.log(res.body);
                    resolve(res.body)
                });
        })

    },

    UploadAssignment: (topic, studentUsername, studentId) => {
        let d = new Date();
        let day = d.getDate();
        let month = d.getMonth()+1;
        let year = d.getFullYear();

        let assignment = {
            studentId: objectId(studentId),
            studentUsername: studentUsername,
            topic: topic,
            date: day+"/"+month+"/"+year
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_ASSIGNMENTS).insertOne({ assignment }).then((response) => {
                resolve(response)
            })
        })
    },

    getPerson: (number) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION).findOne({ 'mobile': number }).then((response) => {
                resolve(response)
            })
        })
    },

    getAssignment: (studentId) => {
        return new Promise(async (resolve, reject) => {
            let assignmentDetails = await db.get().collection(collection.STUDENT_ASSIGNMENTS).find({ 'assignment.studentId': objectId(studentId) }).toArray()
            resolve(assignmentDetails)
        })
    },

    addAttendance: (details) => {
        console.log('called this function');

        var username = details.username;
        var d = details.date;
        var day = parseInt(d);
        var m = details.month;
        var month = parseInt(m)
        var y = details.year;
        var year = parseInt(y)
        console.log(day);

        return new Promise(async (resolve, reject) => {
            let dateExist = await db.get().collection(collection.STUDENT_COLLECTION)
                .findOne({ username: details.username, attendance: day + "/" + month + "/" + year })

            if (!dateExist) {
                await db.get().collection(collection.STUDENT_COLLECTION)
                    .updateOne({ username: details.username },
                        {
                            $push: { attendance: day + "/" + month + "/" + year },
                        }
                    ).then(() => {
                        resolve()
                    })
            } else {
                resolve()
            }
        })
    },

    checkAttendance:(username, day, month, year)=>{
        return new Promise(async(resolve, reject)=>{
            let dateExist = await db.get().collection(collection.STUDENT_COLLECTION)
            .findOne({ username: username, attendance: day + "/" + month + "/" + year })

            if(dateExist){
                console.log("present");
                resolve(dateExist)
            }else{
                resolve()
            }
        })
    },

    getAttendance: (month, year, username, name, rollno) => {
        return new Promise(async (resolve, reject) => {

            let no_of_days = new Date(year, month, 0).getDate();
            no_of_days = "" + no_of_days
            console.log('day ; ', no_of_days);

            let result = [];
            let PresentCount = 0;
            let AbsentCount = 0;

            for (var i = 1; i <= no_of_days; i++) {
                let obj = {};
                let d = i + "/" + month + "/" + year;
                let student = await db.get().collection(collection.STUDENT_COLLECTION)
                    .findOne({ $and: [{ username: username }, { attendance: { $in: [d] } }] })
                console.log('date: ', d);
                console.log('student: ', student);

                if (student) {
                    PresentCount = PresentCount + 1;
                    obj.date = d;
                    obj.status = "P";
                    result.push(obj);
                } else {
                    AbsentCount = AbsentCount + 1;
                    obj.date = d;
                    obj.status = "A";
                    result.push(obj);
                }
            }
            let bj = {};
            let percentage = ((PresentCount / no_of_days) * 100).toFixed(2);
            bj.no_of_days = no_of_days;
            bj.PresentCount = '' + PresentCount;
            bj.AbsentCount = '' + AbsentCount;
            bj.percentage = percentage + "%";
            result.push(bj);

            console.log("result   : ", result);
            resolve(result)

        })
    },

    attendance: () => {
        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.STUDENT_ATTENDANCE).find().toArray()
            resolve(attendance);
        })
    },

    TodaysNotes: (date, month, year) => {
        console.log(date, month, year);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_NOTES).findOne(
                { "notes.date": date, "notes.month": month, "notes.year": year },
                { _id: 0, notes: { $elemMatch: { date: date, month: month, year: year } } }
            ).then((note) => {
                console.log('sdsdsk', note);
                resolve(note)
            })
        })
    },

    TodaysAssignments: (date, month, year) => {
        console.log(date, month, year);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_ASSIGNMENTS).findOne(
                { "assignment.date": date + '/' + month + '/' + year },
                { _id: 0, assignment: { $elemMatch: { date: date + '/' + month + '/' + year } } }
            ).then((assignment) => {
                console.log('sdsdsk', assignment);
                resolve(assignment)
            })
        })
    },

    getPresentAttendance: (month, year, username) => {
        var month = parseInt(month)
        var year = parseInt(year)

        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.ATTENDANCE).find({ "attendance.username": username, "attendance.month": month, "attendance.year": year, "attendance.attendance": 'P' }).toArray()
            resolve(attendance)
        })

    },

    getPresentCount: (month, year, username) => {
        var month = parseInt(month)
        var year = parseInt(year)

        return new Promise(async (resolve, reject) => {
            let PresentCount = await db.get().collection(collection.ATTENDANCE).find({ "attendance.username": username, "attendance.month": month, "attendance.year": year, "attendance.attendance": 'P' }).count()
            console.log('count ', PresentCount);
            resolve(PresentCount)
        })

    },

    getAbsentAttendance: (month, year, username) => {
        var month = parseInt(month)
        var year = parseInt(year)

        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.ATTENDANCE).find({ "attendance.username": username, "attendance.month": month, "attendance.year": year, "attendance.attendance": 'A' }).toArray()
            resolve(attendance)
        })

    },

    getAbsentCount: (month, year, username) => {
        var month = parseInt(month)
        var year = parseInt(year)

        return new Promise(async (resolve, reject) => {
            let AbsentCount = await db.get().collection(collection.ATTENDANCE).find({ "attendance.username": username, "attendance.month": month, "attendance.year": year, "attendance.attendance": 'A' }).count()
            console.log('count ', AbsentCount);
            resolve(AbsentCount)
        })

    },

    getNotes: (month, year) => {
        var month = parseInt(month)
        var year = parseInt(year)

        return new Promise(async (resolve, reject) => {
            let classCount = await db.get().collection(collection.TUTOR_NOTES).find({ "notes.month": month, "notes.year": year }).count()
            console.log('classes ', classCount);
            resolve(classCount)
        })

    },

    getDaysInMonth: (month, year) => {
        var month = month;
        var year = year;

        return new Promise((resolve, reject) => {
            let days = new Date(year, month, 0).getDate();
            console.log('day ; ', days);
            resolve(days)
        })
    },

    getProfile: (username) => {
        return new Promise(async (resolve, reject) => {
            let profile = await db.get().collection(collection.STUDENT_COLLECTION).findOne({ username: username });
            console.log(profile);
            resolve(profile)
        })
    }
}