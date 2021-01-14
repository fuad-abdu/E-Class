var express = require('express');
const tutorHelpers = require('../helpers/tutor-helpers')
const studentHelpers = require('../helpers/student-helpers');
const base64Img = require("base64-img")
const { response } = require('express');
var fs = require('fs');
const { attendance } = require('../helpers/student-helpers');
const paypal = require('paypal-rest-sdk');
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AU77-qfTZ0MiL4j-FuoPjyFI2ip6U1LpO8j7nGfMRzQ6_BuoI5sLI2A04zvZTrj1ik_kOCwcT9YUuYKT',
  'client_secret': 'EJ2iRoSFB-mqRJqC8vJcJQKHa3uZxmIFC53knJSHPns9oo7RezvhoOUSYVyoHWeyBqI4cKh-eQqo51bp'
});
const Cropper = require('cropperjs');
const { announcement } = require('../helpers/tutor-helpers');

module.exports = function (io) {



  var router = express.Router();
  // var messagebird = require('messagebird')(process.env.MESSAGEBIRD_API_KEY);
  var verifyTutorLogin = (req, res, next) => {
    if (req.session.tutor) {
      next()
    } else {
      res.redirect('/tutor-login')
    }
  }
  var verifyStudentLogin = (req, res, next) => {
    if (req.session.student) {
      next()
    } else if (req.session.OtpVerified) {
      next()
    } else {
      res.redirect('/student-login')
    }
  }

  /* GET home page. */
  router.get('/', function (req, res, next) {
    // let tutor = req.session.tutor
    res.render('landing-page');
  });

  router.get('/tutor', verifyTutorLogin, async (req, res) => {
    let announcement = await tutorHelpers.getAnnouncements();
    let students = await tutorHelpers.getStudents()
    let events = await tutorHelpers.getEvents();
    res.render('tutor/tutor', { tutor: true, announcement, events })
  })

  router.get('/tutor-login', (req, res) => {
    if (req.session.tutorloggedIn)
      res.redirect('/tutor')
    else {
      res.render('tutor/login', { "loginErr": req.session.tutorLoggedErr })
      req.session.tutorLoggedErr = false;
    }
  })

  router.post('/tutor-login', (req, res) => {
    console.log(req.body);
    tutorHelpers.DoTutorLogin(req.body).then((response) => {
      if (response.status) {

        req.session.tutor = response.tutor
        req.session.tutorloggedIn = true

        res.redirect('/tutor')
      } else {
        req.session.tutorLoggedErr = true
        res.redirect('/tutor-login')
      }
    })
  })

  router.get('/student', verifyStudentLogin, async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    console.log('hello', req.session.studentNum);
    let user = await studentHelpers.getPerson(req.session.studentNum)
    console.log(user);
    let name = req.session.student
    if (name) {
      console.log('name undu');
      let announcement = await tutorHelpers.getAnnouncements();
      let events = await tutorHelpers.getEvents();
      console.log(announcement, 'announcement');

      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }

      res.render('student/student', { student: true, name, user, announcement, status, events })
    } else if (user) {
      console.log('user undu');
      let announcement = await tutorHelpers.getAnnouncements();
      let events = await tutorHelpers.getEvents();
      console.log(announcement, 'announcement');

      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }

      res.render('student/student', { student: true, name, user, announcement, status, events })
    }

  })

  router.get('/student-login', (req, res) => {
    if (req.session.studentloggedIn)
      res.redirect('/student')
    else {
      res.render('student/login', { "loginErr": req.session.studentLoggedErr })
      req.session.studentLoggedErr = false;
    }
  })

  router.post('/student-login', (req, res) => {
    console.log(req.body);
    studentHelpers.DoStudentLogin(req.body).then((response) => {
      if (response.status) {

        req.session.student = response.student
        req.session.studentloggedIn = true

        res.redirect('/student')
      } else {
        req.session.studentLoggedErr = true
        res.redirect('/student-login')
      }
    })
  })

  router.get('/otp-page', (req, res) => {
    if (req.session.OtpVerified)
      res.redirect('/student')
    else {
      res.render('student/otp-page', { 'numberErr': req.session.numberErr })
      req.session.numberErr = false
    }
  })

  router.post('/send-otp', (req, res) => {
    // let checkNum = studentHelpers.checkMobileNumber(req.body.number).then((response) => {
    //   if (response) {
    req.session.studentNum = req.body.number
    studentHelpers.sendOtp(req.body.number).then((otp_id) => {
      req.session.otpId = otp_id;
      console.log(otp_id);
      res.json({ status: true })
    })
    // }else{
    //   res.redirect('/otp-page')
    //   req.session.numberErr = true
    // }
  })

  router.post('/verify-otp', (req, res) => {
    studentHelpers.verifyOtp(req.body.otp, req.session.otpId).then((response) => {
      if (response.status === 'success') {
        console.log('res', response);
        req.session.OtpVerified = true
        req.session.studentloggedIn = true
        res.json({ status: true })
      } else {
        res.send('Error')
        req.session.OtpVerified = false
        res.json({ status: false })
      }
    })
  })

  router.get('/tutor-logout', (req, res) => {
    req.session.tutor = null
    req.session.tutorloggedIn = false
    res.redirect('/tutor-login')
  })

  router.get('/student-logout', (req, res) => {
    req.session.student = null
    req.session.studentloggedIn = false
    //req.session.studentAttendance = null
    req.session.attendance = false
    res.redirect('/student-login')
  })

  router.get('/tutor-profile', verifyTutorLogin, async (req, res) => {
    let details = await tutorHelpers.getProfile()
    console.log(details);
    res.render('tutor/profile', { tutor: true, details })
  })

  router.post('/tutor-profile', (req, res) => {
    console.log(req.body);
  })

  router.get('/edit-profile', verifyTutorLogin, async (req, res) => {
    let details = await tutorHelpers.getProfile()
    res.render('tutor/edit-profile', { tutor: true, details })
  })

  router.post('/edit-profile', async (req, res) => {
    let details = await tutorHelpers.updateProfile(req.body)
    console.log(req.body);
    let image = req.files.file
    image.mv('./public/tutor-profile/profile.jpg', (err, done) => {
      if (err) console.log(err);
    })
  })

  router.get('/student-details', verifyTutorLogin, async (req, res) => {
    let StudentDetails = await tutorHelpers.getStudents()
    res.render('tutor/student-details', { tutor: true, StudentDetails })
  })

  router.get('/add-student', verifyTutorLogin, (req, res) => {
    res.render('tutor/add-student', { tutor: true })
  })

  router.post('/add-student', async (req, res) => {
    console.log(req.body);
    let StudentDetails = await tutorHelpers.addStudent(req.body)
    let image = req.files.file
    image.mv('./public/student-profile/' + req.body.name + '.jpg', (err, done) => {
      if (err) console.log(err);
    })
    res.redirect('/student-details')
  })

  router.get('/edit-student/:id', verifyTutorLogin, async (req, res) => {
    let id = req.params.id
    let flag = false
    console.log(id);
    let studentDetails = await tutorHelpers.getStudentDetails(id)
    res.render('tutor/edit-student', { tutor: true, studentDetails })
  })

  router.get('/student-assignment-details/:id', verifyTutorLogin, async (req, res) => {
    let d = new Date();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let id = req.params.id
    let studentDetails = await tutorHelpers.getStudentDetails(id)
    let assignment = await studentHelpers.getAssignment(id);
    console.log(assignment);
    let attendance = await studentHelpers.getAttendance(mon, year, studentDetails.username)
    // let AbsentAttendance = await studentHelpers.getAbsentAttendance(mon, year, studentDetails.username)
    console.log(attendance);
    res.render('tutor/student-assignment-details', { tutor: true, studentDetails, assignment, attendance })
  })

  router.post('/edit-student/:id', async (req, res) => {
    let id = req.params.id
    console.log(id);
    console.log(req.body);
    let details = await tutorHelpers.updateStudent(req.body, id)
    let image = req.files.file

    image.mv('./public/student-profile/' + req.body.name + '.jpg', (err, done) => {
      if (err) console.log(err);
    })
    res.redirect('/student-details')
  })

  router.get('/delete-student/:id', verifyTutorLogin, async (req, res) => {
    let id = req.params.id
    let details = await tutorHelpers.deleteStudent(id)
    res.redirect('/student-details')
  })

  router.get('/delete-assignment/:id', async (req, res) => {
    let id = req.params.id
    let details = await tutorHelpers.deleteAssignment(id)
    res.redirect('/tutor-assignment')
  })

  router.get('/delete-note/:id', async (req, res) => {
    let id = req.params.id
    let details = await tutorHelpers.deleteNote(id)
    res.redirect('/tutor-notes')
  })

  router.get('/tutor-assignment', verifyTutorLogin, async (req, res) => {
    let assignment = await tutorHelpers.getAssignment()
    res.render('tutor/assingments', { tutor: true, assignment })
  })

  router.get('/student-assignment', verifyStudentLogin, async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student
    let assignment = await tutorHelpers.getAssignment()
    let user = await studentHelpers.getPerson(req.session.studentNum)
    if (name) {
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    } else if (user) {
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    res.render('student/assignment', { student: true, assignment, name, user, status })
  })

  router.post('/tutor-assignment', async (req, res) => {

    console.log(req.body.topic, req.files.file);
    let topic = req.body.topic
    let file = req.files.file
    if (topic && file) {
      let assignment = await tutorHelpers.UploadAssignment(topic)
      file.mv('./public/assignments/tutor/' + topic + '.pdf', (err, done) => {
        if (err) console.log(err);
      })
      res.redirect('/tutor-assignment')
    } else {
      res.redirect('/tutor-assignment')
    }

    // res.redirect('/tutor-assignment')
  })

  router.post('/student-assignment', async (req, res) => {
    console.log(req.body.topic, req.files.file);
    let topic = req.body.topic
    let file = req.files.file
    let details = req.session.student
    if (topic && file) {
      let assignment = await studentHelpers.UploadAssignment(topic, details.username, details._id);
      file.mv('./public/assignments/student/' + details.username + '.' + topic + '.pdf', (err, done) => {
        if (err) console.log(err);
      })
    } else {
      res.redirect('/student-assignment')
    }
    res.redirect('/student-assignment')
  })

  router.get('/tutor-notes', verifyTutorLogin, async (req, res) => {
    let notes = await tutorHelpers.getNotes()
    res.render('tutor/notes', { tutor: true, notes })
  })

  router.get('/student-notes', verifyStudentLogin, async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student
    let user = await studentHelpers.getPerson(req.session.studentNum)
    let notes = await tutorHelpers.getNotes()
    if (name) {
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    } else if (user) {
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    res.render('student/notes', { student: true, notes, name, user, status })
  })

  router.post('/addAttendance', async (req, res) => {

    if (req.session.attendance) {
      console.log('already clicked');

    } else {
      let attendance = await studentHelpers.addAttendance(req.body);
      console.log('da', req.body);
      // req. session.studentAttendance = req.body;
      req.session.attendance = true;
    }

    res.json({ status: true })
  })

  router.post('/tutor-notes', async (req, res) => {
    if (req.body.topic && req.files.video && req.files.note) {

      let video = req.files.video;
      let topic = req.body.topic;
      let note = req.files.note;


      let notes = await tutorHelpers.UploadNote(req.body)

      video.mv('./public/note/videos/' + topic + '.mp4', (err, done) => {
        if (err) console.log(err);
      })

      note.mv('./public/note/notes/' + topic + '.pdf', (err, done) => {
        if (err) console.log(err);
      })
      console.log('undu');
      res.redirect('/tutor-notes')

    } else {
      console.log('error');
      res.redirect('/tutor-notes')
    }
  })

  router.get('/student-attendance', verifyTutorLogin, async (req, res) => {
    //let students = await tutorHelpers.getStudents();

    let d = new Date();
    let date = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];



    let month = monthNames[d.getMonth()];
    let present = await tutorHelpers.getPresentAttendance(date, mon, year);
    let absent = await tutorHelpers.getAbsentAttendance(date, mon, year);
    res.render('tutor/attendance', { tutor: true, date, month, year, present, absent, mon })
  })

  router.post('/student-attendance', async (req, res) => {
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    console.log('body  ', req.body);
    let date = req.body.date;
    let mon = req.body.month;
    let year = req.body.year;
    let present = await tutorHelpers.getPresentAttendance(date, mon, year);
    let absent = await tutorHelpers.getAbsentAttendance(date, mon, year);
    let month = monthNames[mon - 1];
    res.render('tutor/attendance', { tutor: true, date, month, year, present, absent, mon })
  })

  router.get('/attendance', async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    let month = monthNames[d.getMonth()];

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);

    if (name) {
      console.log('name und');
      let attendance = await studentHelpers.getAttendance(mon, year, name.username);

      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/attendance', { student: true, name, mon, month, year, attendance, status })
    } else if (user) {
      let attendance = await studentHelpers.getAttendance(mon, year, user.username);
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/attendance', { student: true, user, mon, month, year, attendance, status })
    }
  })

  router.post('/attendance', async (req, res) => {
    let f = new Date();
    let d = f.getDate();
    let m = f.getMonth() + 1;
    let y = f.getFullYear();
    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    console.log('body  ', req.body);
    let mon = req.body.month;
    let year = req.body.year;
    let username = req.body.username;
    let month = monthNames[mon - 1];


    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);

    if (name) {
      console.log('name und');
      let attendance = await studentHelpers.getAttendance(mon, year, name.username);
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, d, m, y);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/attendance', { student: true, name, mon, month, year, attendance, status })
    } else if (user) {
      let attendance = await studentHelpers.getAttendance(mon, year, user.username);

      let CheckAttendance = await studentHelpers.checkAttendance(user.username, d, m, y);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/attendance', { student: true, user, mon, month, year, status, attendance, status })
    }
  })

  router.get('/today-task', verifyStudentLogin, async (req, res) => {
    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);
    let d = new Date();
    let date = d.getDate();
    let month = d.getMonth() + 1;
    let year = d.getFullYear();

    let notes = await studentHelpers.TodaysNotes(date, month, year)
    if (notes) {
      if (notes.notes.link) {
        var link = true;
      } else {
        var link = false;
      }
    }
    let assignment = await studentHelpers.TodaysAssignments(date, month, year)

    if (name) {
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, date, month, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    } else if (user) {
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, date, month, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }

    res.render('student/today-task', { student: true, name, user, notes, assignment, status, link })
  })

  router.get("/tutor-announcement", async (req, res)=>{
    let announcement = await tutorHelpers.getAnnouncements();
    res.render('tutor/announcement', { tutor: true, announcement })
  })

  router.get('/add-announcement', verifyTutorLogin, async (req, res) => {
    res.render('tutor/add-announcement', { tutor: true })
  })

  router.get('/student-announcement', async (req, res) => {
    var d = new Date();
    var date = d.getDate();
    var month = d.getMonth() + 1;
    var year = d.getFullYear();

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);

    if (name) {
      let announcement = await tutorHelpers.getAnnouncements();
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, date, month, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/announcement', { student: true, announcement, name, status })
    }
    else if (user) {
      let announcement = await tutorHelpers.getAnnouncements();
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, date, month, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/announcement', { student: true, announcement, user, status })
    }

  })

  router.post('/addAnnouncement', async (req, res) => {
    if (req.body.message && req.body.description) {

      let message = req.body.message;
      let description = req.body.description;
      var d = new Date();
      var date = d.getDate();
      var month = d.getMonth() + 1;
      var year = d.getFullYear();
      var details = {}

      details.message = message;
      details.description = description;

      if (req.files.pdf) {
        let pdf = req.files.pdf;
        details.pdf = true;
        pdf.mv('./public/announcement/pdf/' + message + '.pdf', (err, done) => {
          if (err) console.log(err);
        })
      } else {
        let pdf = null;
      }

      if (req.files.video) {
        let video = req.files.video;
        details.mp4 = true;
  
        video.mv('./public/announcement/video/' + message + '.mp4', (err, done) => {
          if (err) console.log(err);
        })
      } else {
        let video = null;
      }

      if (req.files.image) {
        let image = req.files.image;
        details.jpg = true;

        image.mv('./public/announcement/image/' + message + '.jpg', (err, done) => {
          if (err) console.log(err);
        })
      } else {
        let image = null;
      }
      details.date = date+"/"+month+"/"+year
      let announcementDetails = await tutorHelpers.addAnnouncementDetails(details)
      res.redirect("/tutor-announcement")
    }
  })

  router.get('/announcement-details/:id', async (req, res) => {
    let id = req.params.id;
    let announcement = await tutorHelpers.getAnnouncementDetails(id)
    // let announcementDetails = await tutorHelpers.announcement(announcement.message)
    if (announcement.pdf) {
      var pdf = true
    }
    if (announcement.mp4) {
      var mp4 = true
    }
    if (announcement.jpg) {
      var jpg = true
    }
    res.render('tutor/announcement-details', { tutor: true, announcement, pdf, mp4, jpg })
  })

  router.get("/delete-announcement/:id", async (req, res)=>{
    let id = req.params.id;
    let announcement = await tutorHelpers.deleteAnnouncement(id)
    res.redirect("/tutor-announcement")
  })

  router.get("/delete-event/:id", async (req, res)=>{
    let id = req.params.id;
    let event = await tutorHelpers.deleteEvent(id);
    res.redirect("/tutor-event")
  })

  router.get('/event-details/:id', async (req, res) => {
    let id = req.params.id;
    let event = await tutorHelpers.getEventDetails(id)
    if (event.pdf) {
      var pdf = true;
    }
    if (event.video) {
      var video = true;
    }
    if (event.image) {
      var image = true;
    }
    res.render('tutor/event-details', { tutor: true, event, pdf, video, image })
  })

  router.get('/announcement-detail/:id', async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);
    let id = req.params.id;
    let announcement = await tutorHelpers.getAnnouncementDetails(id)
    let announcementDetails = await tutorHelpers.announcement(announcement.message)
    if (name) {
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    } else if (user) {
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    if (announcementDetails.pdf) {
      var pdf = true
    }
    if (announcementDetails.mp4) {
      var mp4 = true
    }
    if (announcementDetails.jpg) {
      var jpg = true
    }
    res.render('student/announcement-details', { student: true, name, user, announcement, pdf, mp4, jpg, status })
  })

  router.get('/event-detail/:id', async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);
    let id = req.params.id;
    let event = await tutorHelpers.getEventDetails(id)
    if (name) {
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    } else if (user) {
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    if (event.pdf) {
      var pdf = true
    }
    if (event.video) {
      var video = true
    }
    if (event.image) {
      var image = true
    }
    res.render('student/event-details', { student: true, name, user, event, pdf, video, image, status })
  })

  router.get('/tutor-event', async (req, res) => {
    let events = await tutorHelpers.getEvents();
    res.render('tutor/event', { tutor: true, events })
  })

  router.get('/add-event', (req, res)=>{
    res.render('tutor/add-event', { tutor: true })
  })

  router.post('/addEvent', async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    console.log(req.body);
    let details = {}
    let event = req.body.event;
    let conductingBy = req.body.conductingBy;
    let topic = req.body.topic;
    let payment = req.body.payment;

    details.event = event;
    details.conductingBy = conductingBy;
    details.topic = topic;
    details.payment = payment;
    details.date = day+"/"+mon+"/"+year;

    if (req.files.video) {
      details.video = true;
      let video = req.files.video;
      video.mv('./public/event/video/' + topic + '.mp4', (err, done) => {
        if (err) console.log(err);
      })
    }
    if (req.files.image) {
      details.image = true;
      let image = req.files.image;
      image.mv('./public/event/image/' + topic + '.jpg', (err, done) => {
        if (err) console.log(err);
      })
    }
    if (req.files.pdf) {
      details.pdf = true;
      let pdf = req.files.pdf;
      pdf.mv('./public/event/pdf/' + topic + '.pdf', (err, done) => {
        if (err) console.log(err);
      })
    }
    if (req.body.payment === 'free') {
      details.paid = false;
    } else {
      details.paid = true;
    }

    tutorHelpers.addEvents(details).then((eventId) => {
      if (req.body.payment === 'free') {
        console.log('payment is free');
        res.redirect('/tutor-event')
        res.json({ status: true })
      } else {
        console.log('payment is paid');
        console.log(eventId);
        res.render('tutor/paymentGateway', { tutor: true, eventId })
      }
    })
    console.log(details);

  })

  router.post('/paymentmethod', (req, res) => {
    console.log(req.body);
    if (req.body.paymentMethod === 'true') {
      console.log('razorpay');
      var eventId = req.body.eventId;
      res.json({ status: true, eventId })
    } else if (req.body.paymentMethod === 'false') {
      console.log('paypal');
      var eventId = req.body.eventId;
      res.json({ status: false, eventId })
    }
  })

  router.post('/getAmount', (req, res) => {
    console.log(' payment : ', req.body.paymentMethod);
    if (req.body.paymentMethod) {
      res.json({ razorpay: true })
    } else {
      res.json({ paypal: true })
    }
  })

  router.get('/razorpay-amount/:status/:id', (req, res) => {
    let status = req.params.status;
    let eventId = req.params.id;
    console.log(status, eventId);
    res.render('tutor/razorpay-amount', { tutor: true, eventId, status })
  })

  router.get('/paypal-amount/:status/:id', (req, res) => {
    let status = req.params.status;
    let eventId = req.params.id;
    console.log('hadsajf ', status, eventId);
    res.render('tutor/paypal-amount', { tutor: true, eventId, status })
  })

  router.post('/razorpay-amount', (req, res) => {
    console.log('body', req.body);
    let paymentGateway = req.body.paymentGateway;
    let eventId = req.body.eventId;
    let amount = req.body.amount;
    if (paymentGateway) {
      tutorHelpers.generateRazorpay(eventId, amount).then((response) => {
        console.log(response);
        res.json({ status: true, response })
      })
    } else {
      res.json({ status: false })
    }
  })

  router.post('/paypal-verify', (req, res) => {
    console.log('body', req.body);
    let paymentGateway = req.body.paymentGateway;
    let eventId = req.body.eventId;
    let amount = req.body.amount;

    amount = parseInt(amount);

    const create_payment_json = {
      "intent": "sale",
      "payer": {
        "payment_method": "paypal"
      },
      "redirect_urls": {
        "return_url": "http://localhost:3000/success/" + amount,
        "cancel_url": "http://localhost:3000/add-event"
      },
      "transactions": [{
        "item_list": {
          "items": [{
            "name": "Red Sox Hat",
            "sku": "001",
            "price": amount,
            "currency": "USD",
            "quantity": 1
          }]
        },
        "amount": {
          "currency": "USD",
          "total": amount
        },
        "description": "Hat for the best team ever"
      }]
    };

    paypal.payment.create(create_payment_json, function (error, payment) {
      if (error) {
        throw error;
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === 'approval_url') {
            res.redirect(payment.links[i].href);
          }
        }

      }
    });
  })

  router.get('/success/:amount', (req, res) => {
    let amount = req.params.amount;
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;

    const execute_payment_json = {
      "payer_id": payerId,
      "transactions": [{
        "amount": {
          "currency": "USD",
          "total": amount
        }
      }]
    };

    paypal.payment.execute(paymentId, execute_payment_json, function (error, payment) {
      if (error) {
        console.log(error.response);
        throw error;
      } else {
        console.log(JSON.stringify(payment));
        res.redirect('/tutor')
      }
    });
  });

  router.get('/cancel', (req, res) => {
    res.send('Cancelled');
  });

  router.post('/verify-payment', (req, res) => {
    console.log('verify', req.body);
    tutorHelpers.verifyRazorpayPayment(req.body).then(() => {
      
    })
    res.redirect('/tutor')
  })

  router.get('/tutor-photos', async (req, res) => {
    let photos = await tutorHelpers.getPhotos();
    res.render('tutor/photos', { tutor: true, photos })
  })

  router.get("/student-photos", async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);

    if (name) {
      let photos = await tutorHelpers.getPhotos();
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/photos', { student: true, photos, name, status })
    }
    else if (user) {
      let photos = await tutorHelpers.getPhotos();
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
      res.render('student/photos', { student: true, photos, user, status })
    }

  })

  router.get('/add-photos', (req, res) => {
    res.render('tutor/add-photos', { tutor: true })
  })

  router.post('/add-photos', async (req, res) => {
    console.log(req.files);
    if (req.body && req.files) {
      let name = req.body.name;
      let image = req.body.base64data;
      base64Img.img(image, "./public/photos/", name, function (err, filepath) {

      })
      let addImage = await tutorHelpers.addImage(name)
      res.redirect('/tutor-photos')

    }
  })

  router.get("/student-profile", async (req, res) => {
    let d = new Date();
    let day = d.getDate();
    let mon = d.getMonth() + 1;
    let year = d.getFullYear();

    let name = req.session.student;
    let user = await studentHelpers.getPerson(req.session.studentNum);
    let profile;
    if (name) {
      profile = await studentHelpers.getProfile(name.username);
      let CheckAttendance = await studentHelpers.checkAttendance(name.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    else if (user) {
      profile = await studentHelpers.getProfile(user.username);
      let CheckAttendance = await studentHelpers.checkAttendance(user.username, day, mon, year);
      if (CheckAttendance) {
        var status = true;
      } else {
        var status = false;
      }
    }
    res.render('student/profile', { student: true, profile, user, name, status })
  })

  router.post("/upload-video", (req, res) => {
    console.log("Progress Completed");
  })

  return router;


}