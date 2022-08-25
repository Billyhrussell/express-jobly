"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  jobIds
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {

  const newJob = {
    title: "testTitle",
    salary: 10000,
    equity: 0.5,
    companyHandle: "c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
          `SELECT title, salary, equity, company_handle as "companyHandle"
           FROM jobs
           WHERE title = 'testTitle'`);
    expect(result.rows).toEqual([
      {
        title: "testTitle",
        salary: 10000,
        equity: 0.5,
        companyHandle: "c1"
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Job.create(newJob);
      await Job.create(newJob);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** sqlForFiltering */

describe("sqlForFiltering", function(){
  test("recieve correct data obj", function(){
    const data = {title: '1', minSalary: 1000, hasEquity: true};

    expect(Job._sqlForFiltering(data)).toEqual(
      {where: 'WHERE title ILIKE $1 AND salary >= $2 AND equity > 0',
       values: ['%1%', 1000]
      }
    )
  })

  test("recieve empty data object", function(){
    const data = {};

    expect(Job._sqlForFiltering(data)).toEqual(
      {where: '',
       values: []
      }
    )
  })
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll({});
    expect(jobs).toEqual([
      {
        title: "j1",
        salary: 1000,
        equity: 0.1,
        companyHandle: "c1"
      },
      {
        title: "j2",
        salary: 2000,
        equity: 0.2,
        companyHandle: "c2"
      },
      {
        title: "j3",
        salary: 3000,
        equity: 0,
        companyHandle: "c3"
      },
    ]);
  });

  test("works:filter", async function (){
    let jobs = await Job.findAll({ title: "1" });
    expect(jobs).toEqual(
      [{
        title: "j1",
        salary: 1000,
        equity: 0.1,
        companyHandle: "c1"
    }]);
  });

  test("works:filtering multiple conditions", async function(){
    let jobs = await Job.findAll({ title: "2", minSalary: 2000});
    expect(jobs).toEqual(
      [{
        title: "j2",
        salary: 2000,
        equity: 0.2,
        companyHandle: "c2"
      }]
    )
  });

  test("works:filtering by equity", async function(){
    let jobs = await Job.findAll({ hasEquity: true });
    expect(jobs).toEqual(
      [{
        title: "j1",
        salary: 1000,
        equity: 0.1,
        companyHandle: "c1"
      },
      {
        title: "j2",
        salary: 2000,
        equity: 0.2,
        companyHandle: "c2"
      }]
    )
  });
});


/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get(jobIds[0]);
    expect(job).toEqual({
      title: "j1",
      salary: 1000,
      equity: 0.1,
      companyHandle: "c1"
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(100000);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "j4",
    salary: 4000,
    equity: 0.4
  };

  test("works", async function () {
    let job = await Job.update(jobIds[0], updateData);
    expect(job).toEqual({
      ...updateData,
      companyHandle: "c1"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle AS "companyHandle"
           FROM jobs
           WHERE title = 'j4'`);
    expect(result.rows).toEqual([{
      title: "j4",
      salary: 4000,
      equity: 0.4,
      companyHandle: "c1"
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "j4",
      salary: null,
      equity: null
    };

    let job = await Job.update(jobIds[0], updateDataSetNulls);
    expect(job).toEqual({
      ...updateDataSetNulls,
      companyHandle: "c1"
    });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle AS "companyHandle"
      FROM jobs
      WHERE title = 'j4'`);
    expect(result.rows).toEqual([{
      title: "j4",
      salary: null,
      equity: null,
      companyHandle: "c1"
    }]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update(454, updateData);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(jobIds[0], {});
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(jobIds[0]);
    const res = await db.query(
        "SELECT id FROM jobs WHERE id=$1", [jobIds[0]]);
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove(454);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
