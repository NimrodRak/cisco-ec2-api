const app = require("../src/build/app")
const request = require("supertest")

const authKeys = "Basic QUtJQTM0MlA0UFhUR09INDZMSkU6aEpBZ3ZFWVQwTFFHTXBsa3lJTGdMdjkvYXVpR2JGUm5tUW9zeVI2dg==";
describe("Check default behaviour", () => {
    test("GET /api/:region/instances", (done) => {
        request(app.default)
            .get("/api/us-east-1/instances")
            .set("Authorization", authKeys)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                return done()
            })
    })
    test("GET /", (done) => {
        request(app.default)
            .get("/")
            .expect(404)
            .end((err, res) => {
                if (err) return done(err);
                return done()
            })
    })
    test("GET /api/region/instances w/ filters", (done) => {
        request(app.default)
            .get("/api/us-east-1/instances?type=t2.micro")
            .set("Authorization", authKeys)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(Number(res.headers["content-length"])).toBeGreaterThan(100);
                return done()
            })
    })
    test("GET /api/region/instances w/ filters and invalid sorting", (done) => {
        request(app.default)
            .get("/api/us-east-1/instances?state=running&sortby=foo")
            .set("Authorization", authKeys)
            .expect(400)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.error.text).toEqual(expect.stringContaining("error"));
                return done()
            })
    })
})