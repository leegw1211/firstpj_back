const express = require('express');
const cors = require('cors');
const app = express();
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded( {extended : false } ));
const maria = require('mysql'); // 호환됌!!!
// const connection = maria.createConnection({
//     host     : 'localhost',
//     port     :  3307,
//     user     : 'root',
//     password : '12345678',
//     database : 'firstpj'
// })
const connection = maria.createConnection({
    host     : 'svc.sel4.cloudtype.app',
    port     :  30554,
    user     : 'root',
    password : 'a1234567',
    database : 'firstpj'
})

// app.get('/', (req, res) => {
//     fs.readFile('index.html', 'utf8', (err, data) => {
//         res.send(data);
//     });
// });

app.get('/setupserver', (req, res) => {
    connection.query(`SET GLOBAL event_scheduler=ON;`, (error, results) => {
        connection.query(`CREATE EVENT IF NOT EXISTS del_expired_sessionid
        ON SCHEDULE EVERY 10 minute STARTS now()
        DO DELETE FROM sessionid WHERE expire_date < NOW();`, (error, results) => {
            res.send(results);
        });
    });
});

app.post('/register', (req, res) => {
    if (req.body.registerId == "") res.status(500).send("아이디를 입력하세요")
    else if (req.body.registerPw == "") res.status(500).send("비밀번호를 입력하세요")
    else { 
        connection.query(`insert into user (username, password) \
        values('${req.body.registerId}', '${req.body.registerPw}');`, (error, results) => {
            if (error) res.status(500).send("존재하는 아이디입니다");
            else res.send();
        });
    }
}); 

app.post('/login', (req, res) => {
    connection.query(`select * from user where username='${req.body.loginId}' and password='${req.body.loginPw}'`, (error, results) => {
        if (results.length === 0) res.send(results);
        else {
            var sessionId = generateSessionId();
            connection.query(`insert into sessionid (userid, string, expire_date) \
            values ('${results[0].uid}', '${sessionId}', DATE_ADD(NOW(),INTERVAL + 1 day))`, (error2, results2) => {
                res.setHeader('Access-Control-Allow-origin', 'https://pnucse99.netlify.app');
                res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); // 쿠키 주고받기 허용
                res.setHeader('Access-Control-Allow-Credentials', 'true');
                res.cookie('sessionId', sessionId, {
                    httpOnly: false, // 클라이언트에서 쿠키 조작 방지
                    secure: true // HTTPS에서만 전송
                });
                res.send(results);
            })
        };
    });
});

app.post('/usercheck', (req, res) => {
    connection.query(`select * from sessionid where string='${req.cookies.sessionId}';`, (error, results) => {
        if (results.length == 0) res.send(results);
        else {
            connection.query(`select * from user where uid='${results[0].userid}';`, (error, results) => {
                res.send(results);
            });
        };
    });
});

app.post('/getcategory', (req, res) => {
    connection.query(`select * from category`, (error, results) => {
        res.send(results);
    });
});

app.post('/getcategory_fromplaceid', (req, res) => { // id, cid, placetype으로 이루어진 테이블을 반환함
    if(req.body.placeid) { // body에 placeid가 있으면 그 음식점의 placetype만 반환
        connection.query(`SELECT place_cat_map.id, place_cat_map.cid, category.placetype
        FROM place_cat_map
        JOIN category ON place_cat_map.cid = category.cid
        where id=${req.body.placeid};`, (error, results) => {
            res.send(results);
        });
    }
    else { //body에 id가 없으면 모든 id 즉 전체 테이블을 반환함
        connection.query(`SELECT place_cat_map.id, place_cat_map.cid, category.placetype
        FROM place_cat_map
        JOIN category ON place_cat_map.cid = category.cid;`, (error, results) => {
            res.send(results);
        });
    }
})

app.post('/addcategory', (req, res) => { // 새 카테고리 추가하기
    connection.query(`insert into category (placetype)\
    values('${req.body.placetype}');`, (error, results) => {
        res.send();
    });
})

app.post('/addplace', (req, res) => { // 음식점 추가 // 선택 안하고 추가하기 눌렀을 때의 예외처리 해야함
    connection.query(`insert into list (name, latitude, longitude) \
    values('${req.body.name}', '${req.body.latitude}', '${req.body.longitude}');`, (error, results) => {
        const query = 'INSERT INTO place_cat_map (id, cid) VALUES (?, ?)';
        req.body.category.forEach(async (categoryId) => {
            const restaurantId = results.insertId;
            await new Promise((resolve, reject) => {
                connection.query(query, [restaurantId, categoryId], (err, result) => {
                    resolve();
                });
            })
        });
        res.send();
    });
});

app.post('/modifyplace', (req, res) => {
    connection.query(`update list set name='${req.body.name}' where id='${req.body.id}'`, (error, results) => {
        connection.query(`delete from place_cat_map where id='${req.body.id}';`, (error, results) => {
            const query = 'INSERT INTO place_cat_map (id, cid) VALUES (?, ?)';
            req.body.category.forEach(async (categoryId) => {
                const restaurantId = req.body.id;
                await new Promise((resolve, reject) => {
                    connection.query(query, [restaurantId, categoryId], (err, result) => {
                        resolve();
                    });
                })
            });
            res.send();
        })
    });
});

app.post('/deleteplace', (req, res) => {
    connection.query(`delete from place_cat_map where id='${req.body.id}';`, (error, results) => {
        connection.query(`delete from list where id='${req.body.id}';`, (error, results) => {
            res.send();
        })
    })
})

app.post('/searchplace', (req, res) => {
    connection.query(`SELECT list.*, COUNT(review.placeid) AS count 
    FROM list
    LEFT JOIN review ON list.id = review.placeid
    WHERE list.name LIKE '%${req.body.searchTerm}%'
    GROUP BY list.id;`, (error, results) => {
        res.send(results);
    });
})

app.post('/getplaces_fromcategory_scoredesc', (req, res) => { // body에 들어온 category에 속하는 음식점을 별점순으로 반환해줌
    if (req.body.category != 0) { // 카테고리 아이디가 0이 아니면 해당 카테고리에 맞는 음식점을 보내줌
        connection.query(`SELECT list.*, COUNT(review.placeid) AS count 
        FROM list
        LEFT JOIN review ON list.id = review.placeid
        INNER JOIN place_cat_map ON list.id = place_cat_map.id
        WHERE place_cat_map.cid = ${req.body.category}
        GROUP BY list.id
        ORDER BY avgscore DESC;`, (error, results) => {
            res.send(results);
        });
    } else { // 카테고리 id가 0이면 다 보내줌
        connection.query(`SELECT list.*, COUNT(review.placeid) AS count 
        FROM list
        LEFT JOIN review ON list.id = review.placeid
        GROUP BY list.id
        order by avgscore desc;`, (error, results) => {
            res.send(results);
        });
    }
})

app.post('/getplaces_fromcategory_countdesc', (req, res) => { // body에 들어온 category에 속하는 음식점을 리뷰많은순으로 반환해줌
    if (req.body.category != 0) { // 카테고리 아이디가 0이 아니면 해당 카테고리에 맞는 음식점을 보내줌
        connection.query(`SELECT list.*, COUNT(review.placeid) AS count 
        FROM list
        LEFT JOIN review ON list.id = review.placeid
        INNER JOIN place_cat_map ON list.id = place_cat_map.id
        WHERE place_cat_map.cid = ${req.body.category}
        GROUP BY list.id
        ORDER BY count DESC;`, (error, results) => {
            res.send(results);
        });
    } else { // 카테고리 id가 0이면 다 보내줌
        connection.query(`SELECT list.*, COUNT(review.placeid) AS count 
        FROM list
        LEFT JOIN review ON list.id = review.placeid
        GROUP BY list.id
        order by count desc;`, (error, results) => {
            res.send(results);
        });
    }
})

app.post('/getlist_fromid', (req, res) => {
    connection.query(`SELECT list.*, COUNT(review.placeid) AS count
    FROM list
    LEFT JOIN review ON list.id = review.placeid
    WHERE list.id = '${req.body.id}'
    GROUP BY list.id`, (error, results) => {
        res.send(results);
    });
})

app.post('/loadreviewlist', (req, res) => { // 특정 음식점에 대한 리뷰 들고옴
    connection.query(`select * from review where placeid=${req.body.placeid}`, (error, results) => {
        res.send(results);
    });
})

app.post('/loadpost', (req, res) => { // 특정 리뷰 들고옴 ( 내용 보여주기용 )
    connection.query(`select * from review where rid=${req.body.rid}`, (error, results) => {
        res.send(results);
    });
})

app.post('/deletepost', (req, res) => { // 리뷰 삭제
    connection.query(`delete from review where rid='${req.body.rid}'`, (error, results) => {
        connection.query(`update list set avgscore = (select avg(score) from review where placeid=list.id);`, (error, results) => {
            res.send();
        })
    })
})

app.post('/modify', async (req, res) => { // 리뷰 수정
    connection.query(`UPDATE review SET title='${req.body.title}', description=${maria.escape(req.body.description)} WHERE rid = ${req.body.rid};`, (error, results) => {
        connection.query(`update list set avgscore = (select avg(score) from review where placeid=list.id);`, (error, results) => {
        })
        res.send(results);
    })
})

app.post('/review', async (req, res) => { // 리뷰 등록
    var uname = await getusername(req.cookies.sessionId);
    connection.query(`insert into review (placeid, title, description, username, score)\
    values('${req.body.placeid}', '${req.body.title}', ${maria.escape(req.body.description)}, '${uname}', '${req.body.score}');`, (error, results) => {
        connection.query(`update list set avgscore = (select avg(score) from review where placeid=list.id);`, (error, results) => {
            res.send();
        })
    });
})

app.post('/changePagename', async (req, res) => { // body.pgname이 있으면 바꾼 후에 반환, 없으면 현재 홈페이지 이름 반환 (처음 로딩할때)
    if (req.body.pgname || req.body.pgname == "") { // body.pgname이 존재할때
        if (req.body.pgname !== "") {
            connection.query(`select * from sessionid where string='${req.cookies.sessionId}'`, (error, results) => {
                if (results.length !== 0) {
                    connection.query(`delete from pagename;`, (error, results) => {
                        connection.query(`insert into pagename (pgname) values ('${req.body.pgname}');`, (error, results) => {
                            res.send();
                        });
                    });
                } else {
                    res.status(500).send("로그인을 해주세요");
                }
            })
        } else res.status(500).send("내용을 입력하세요");
    } else { // body.pgname이 없을 때 -> 홈페이지 이름 바꾸기 요청이 아닌 그냥 이름을 띄우기 위한 요청
        connection.query(`select * from pagename`, (error, results) => {
            res.send(results);
        });
    }
})

app.post('/userRequest', (req, res) => {
    if (req.body.request == "") res.status(500).send("내용을 입력하세요");
    else {
        connection.query(`select * from sessionid where string='${req.cookies.sessionId}'`, (error, results) => {
            if (results.length !== 0) {
                connection.query(`select * from user where uid='${results[0].userid}'`, (error, results) => {
                    connection.query(`insert into user_request (username, request) values ('${results[0].username}', '${req.body.request}')`, (error, results) => {
                        res.send();
                    })
                })
            } else res.status(500).send("로그인을 해주세요");
        })
    }
})

app.post('/getuserRequest', (req, res) => { //
    connection.query(`select * from user_request`, (error, results) => {
        res.send(results);
    });
})

app.post('/deluserRequest', (req, res) => { //
    console.log(req.body.no);
    connection.query(`delete from user_request where no='${req.body.no}'`, (error, results) => {
        console.log(results);
        res.send();
    });
})

app.listen(3000, () => {
    console.log(`listening...`);
});

function generateSessionId(length = 16) {
    const randomBytes = crypto.randomBytes(length);
    return randomBytes.toString('hex');
}

async function getusername(sessionId) {
    var termUid = await new Promise((resolve, reject) => {
        connection.query(`select * from sessionid where string='${sessionId}'`, (error, results) => {
            resolve(results[0].userid);
        })
    })
    var username = await new Promise((resolve, reject) => {
        connection.query(`select * from user where uid='${termUid}'`, (error, results) => {
            resolve(results[0].username);
        })
    })
    return username;
}