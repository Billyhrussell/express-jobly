"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  uAdminToken,
  jobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "Blogger",
    salary: 90000,
    equity: 0.1,
    companyHandle: "c3"
  };

  test("ok for admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        title: "Blogger",
        salary: 90000,
        equity: "0.1",
        companyHandle: "c3"
      },
    });
  });

  test("unauth for non-admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "Eating"
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: 5,
          salary: "hi",
          companyHandle: "c1"
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});
// TODO: also add error messages

/************************************** GET / jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [ {
              title: "Pet sitter",
              salary: 5000,
              equity: null,
              companyHandle: "c1"
            },
            {
              title: "Dog Washer",
              salary: 10000,
              equity: "0.1",
              companyHandle: "c1"
            },
            {
              title: "Coding",
              salary: 90000,
              equity: "0.2",
              companyHandle: "c3"
            }
          ],
    });
  });

  test("filter by name", async function () {
    const resp = await request(app).get("/jobs?title=Coding");

    expect(resp.body).toEqual({
      jobs:
          [
            {
              title: "Coding",
              salary: 90000,
              equity: "0.2",
              companyHandle: "c3"
            }
          ],
    });
  });

  test("filter by name and equity", async function () {
    const resp = await request(app).get("/jobs")
    .query({title: "coding", hasEquity: true});
    expect(resp.body).toEqual({
      jobs:
          [
            {
              title: "Coding",
              salary: 90000,
              equity: "0.2",
              companyHandle: "c3"
            }
          ],
    });
  });

  test("check salary cannot be string", async function() {
    const resp = await request(app).get("/jobs")
    .query({ salary: "TEST" });

    expect(resp.statusCode).toEqual(400);
  });

  test("check invalid data: title > 30 chars", async function() {
    const resp = await request(app).get("/jobs")
    .query({ title: "111111111111111111111111111111111" });

    expect(resp.statusCode).toEqual(400);
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    console.log("jobIds[0]: ", jobIds)
    const resp = await request(app).get(`/jobs/${jobIds[0]}`);
    expect(resp.body).toEqual({
      job: {
        title: "Pet sitter",
        salary: 5000,
        equity: null,
        companyHandle: "c1"
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/11111`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobIds[0]}`)
        .send({
          title: "Pet Supervisor",
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.body).toEqual({
      job: {
        title: "Pet Supervisor",
        salary: 5000,
        equity: null,
        companyHandle: "c1"
      },
    });
  });

  test("unauth for regular users", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobIds[0]}`)
        .send({
          name: "C1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobIds[0]}`)
        .send({
          name: "C1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/11111`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobIds[0]}`)
        .send({
          company_handle: "c1-new",
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
        .patch(`/jobs/${jobIds[0]}`)
        .send({
          title: 1,
        })
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const resp = await request(app)
        .delete(`/jobs/${jobIds[0]}`)
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.body).toEqual({ deleted: jobIds[0] });
  });

  test("unauth for users", async function () {
    const resp = await request(app)
        .delete(`/jobs/${jobIds[0]}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/${jobIds[0]}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
        .delete(`/jobs/55555`)
        .set("authorization", `Bearer ${uAdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
