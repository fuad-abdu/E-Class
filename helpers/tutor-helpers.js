var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
const Razorpay = require('razorpay')
var instance1 = new Razorpay({
    key_id: 'rzp_test_gPuz8uPkT732Wd',
    key_secret: 'VOk1v59M2OjhyQNKGVVhLvKU',
});

var objectId = require('mongodb').ObjectId

module.exports = {

    // DoSignup:(tutorData)=>{
    //     return new Promise(async(resolve,reject)=>{
    //         tutorData.password = await bcrypt.hash(tutorData.password, 10)
    //         db.get().collection(collection.TUTOR_COLLECTION).insertOne(tutorData).then((data) => {
    //             resolve(data.ops[0])
    //         })
    //     })
    // },
    DoTutorLogin: (tutorData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.TUTOR_COLLECTION).findOne({ username: tutorData.username })
            if (user) {
                bcrypt.compare(tutorData.password, user.password).then((status) => {
                    if (status) {
                        console.log('login sucsess')
                        response.tutor = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed');
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('failed');
                resolve({ status: false })
            }
        })
    },

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

    getProfile: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_PROFILE).findOne({ _id: objectId("5ffc78427c4ac3a5526fd729") }).then((details) => {
                resolve(details)
            })
        })
    },

    updateProfile: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_PROFILE)
                .updateOne({ _id: objectId("5ffc78427c4ac3a5526fd729") },
                    {
                        $set: {
                            details: {
                                name: details.name,
                                job: details.job,
                                class: details.class,
                                address: details.address,
                                pin: details.pin,
                                mobile: details.mobile,
                                email: details.email
                            }
                        }
                    }
                ).then((details) => {
                    resolve(details)
                })
        })
    },

    addStudent: (studentDetails) => {
        let date = new Date();
        let d = date.getDate();
        var day = parseInt(d)
        let m = date.getMonth() + 1;
        var month = parseInt(m)
        let y = date.getFullYear();
        var year = parseInt(y)

        let student = {
            name: studentDetails.name,
            gender: studentDetails.radio,
            rollno: studentDetails.rollno,
            mobile: studentDetails.mobile,
            email: studentDetails.email,
            address: studentDetails.address,
            username: studentDetails.username,
            password: studentDetails.password,
            attendance: [
                
            ]
        }
        // let attendance = {
        //     date: day,
        //     month: month,
        //     year: year,
        //     username: studentDetails.username,
        //     name: studentDetails.name,
        //     rollno: studentDetails.rollno,
        //     attendance: 'A'
        // }
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION).insertOne(student).then((response) => {
                resolve(response)
            })

            // db.get().collection(collection.ATTENDANCE).insertOne({ attendance }).then((response) => {
            //     resolve(response)
            // })
        })
    },

    UploadAssignment: (topic) => {
        var day = new Date()
        var month = day.getMonth() + 1;
        var hour = day.getHours()
        var minute = day.getMinutes()
        let assignment = {
            topic: topic,
            date: day.getDate() + '/' + month + '/' + day.getFullYear(),
            time: hour + ':' + minute
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_ASSIGNMENTS).insertOne({ assignment }).then((response) => {
                resolve(response)
            })
        })
    },

    UploadNote: (details) => {
        var day = new Date()
        var month = day.getMonth() + 1;
        var hour = day.getHours()
        var minute = day.getMinutes()
        let notes = {
            topic: details.topic,
            link: details.link,
            date: day.getDate(),
            month: month,
            year: day.getFullYear(),
            time: hour + ':' + minute
        }
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_NOTES).insertOne({ notes }).then((response) => {
                resolve(response)
            })
        })
    },

    getAssignment: () => {
        return new Promise(async (resolve, reject) => {
            let assignment = await db.get().collection(collection.TUTOR_ASSIGNMENTS).find().toArray()
            console.log(assignment);
            resolve(assignment)
        })
    },

    getNotes: () => {
        return new Promise(async (resolve, reject) => {
            let note = await db.get().collection(collection.TUTOR_NOTES).find().toArray()
            console.log('note', note);
            resolve(note)
        })
    },

    getStudents: () => {
        return new Promise(async (resolve, reject) => {
            let students = await db.get().collection(collection.STUDENT_COLLECTION).find().toArray()
            resolve(students)
        })
    },

    getStudentDetails: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION).findOne({ _id: objectId(id) }).then((details) => {
                resolve(details)
            })
        })
    },

    updateStudent: (details, id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION)
                .updateOne({ _id: objectId(id) },
                    {
                        $set: {
                            name: details.name,
                            gender: details.radio,
                            rollno: details.rollno,
                            address: details.address,
                            mobile: details.mobile,
                            email: details.email,
                            username: details.username,
                            password: details.password
                        }
                    }
                ).then((details) => {
                    resolve(details)
                })
        })
    },

    deleteStudent: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.STUDENT_COLLECTION).removeOne({ _id: objectId(id) }).then((response) => {
                resolve(response)
            })
        })
    },

    deleteAnnouncement:(id)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ANNOUNCEMENT_DETAILS).removeOne({ _id: objectId(id) }).then((response) => {
                resolve(response)
            })
        })
    },

    deleteEvent:(id)=>{
        return new Promise((resolve, reject) => {
            db.get().collection(collection.EVENT).removeOne({ _id: objectId(id) }).then((response) => {
                resolve(response)
            })
        })
    },

    deleteAssignment: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_ASSIGNMENTS).removeOne({ _id: objectId(id) }).then((response) => {
                resolve(response)
            })
        })
    },

    deleteNote: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.TUTOR_NOTES).removeOne({ _id: objectId(id) }).then((response) => {
                resolve(response)
            })
        })
    },

    addAnnouncement: (message, description, date, month, year) => {
        let announcement = {
            date: date + '/' + month + '/' + year,
            message: message,
            description: description
        }
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.ANNOUNCEMENT).insertOne(announcement).then((response) => {
                resolve(response)
            })
        })
    },

    getAnnouncements: () => {
        return new Promise(async (resolve, reject) => {
            let announcement = await db.get().collection(collection.ANNOUNCEMENT_DETAILS).find().toArray()
            console.log(announcement);
            resolve(announcement)
        })
    },

    getEvents: () => {
        return new Promise(async (resolve, reject) => {
            let event = await db.get().collection(collection.EVENT).find().toArray()
            console.log(event);
            resolve(event)
        })
    },

    getAnnouncementDetails: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ANNOUNCEMENT_DETAILS).findOne({ _id: objectId(id) }).then((details) => {
                console.log(details);
                resolve(details)
            })
        })
    },

    getEventDetails: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.EVENT).findOne({ _id: objectId(id) }).then((details) => {
                console.log(details);
                resolve(details)
            })
        })
    },

    announcement: (message) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ANNOUNCEMENT_DETAILS).findOne({ message: message }).then((details) => {
                console.log(details);
                resolve(details)
            })
        })
    },

    addAnnouncementDetails: (details) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ANNOUNCEMENT_DETAILS).insertOne(details).then((response) => {
                resolve(response)
            })
        })
    },

    getPresentAttendance: (date, month, year) => {
        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.STUDENT_COLLECTION).find({ "attendance": date+"/"+month+"/"+year}).toArray()
            console.log("attendance : ",attendance);
            resolve(attendance)
        })

    },

    getAbsentAttendance: (date, month, year) => {
        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.STUDENT_COLLECTION).find({ "attendance": { $ne: date+"/"+month+"/"+year}}).toArray()
            console.log("absent : ",attendance);
            resolve(attendance)
        })

    },

    getDateAttendance: (date) => {
        return new Promise(async (resolve, reject) => {
            let attendance = await db.get().collection(collection.STUDENT_ATTENDANCE).find({ "report.date": date }).toArray()
            console.log(attendance);
            resolve(attendance)
        })
    },

    addEvents: (details) => {
        return new Promise(async (resolve, reject) => {
            db.get().collection(collection.EVENT).insertOne(details).then((response) => {
                resolve(response.ops[0]._id)
            })
        })
    },

    generateRazorpay: (eventId, amount) => {
        var amount = parseInt(amount)
        return new Promise((resolve, reject) => {
            var options = {
                amount: amount * 100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: "" + eventId
            };
            instance1.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                    console.log('err');
                } else {
                    console.log('new order ', order);
                    resolve(order)
                }
            });
        })
    },

    verifyRazorpayPayment: (details) => {
        console.log(' details : ', details);
        return new Promise((resolve, reject) => {

            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'VOk1v59M2OjhyQNKGVVhLvKU')
            hmac.update(details.payment.razorpay_order_id + '|' + details.payment.razorpay_payment_id)
            hmac = hmac.digest('hex');
            if (hmac === details.payment.razorpay_signature) {
                console.log('success');
                resolve()
            } else {
                console.log('failed');
                reject()
            }
        })
    },

    addImage: (Name) => {
        var d = new Date()
        var date = d.getDate();
        var month = d.getMonth() + 1;
        var year = d.getFullYear();

        let name = {
            date: date + '/' + month + '/' + year,
            name: Name
        }

        return new Promise((resolve, reject) => {
            db.get().collection(collection.PHOTOS_COLLECTION).insertOne(name).then((response) => {
                resolve(response)
            })
        })
    },

    getPhotos: () => {
        return new Promise(async (resolve, reject) => {
            let photos = await db.get().collection(collection.PHOTOS_COLLECTION).find().toArray()
            console.log(photos);
            resolve(photos)
        })
    },

    checkAttendance: (stundents) => {
        db.get().collection(collection.STUDENT_COLLECTION).find({

        })
    }
}