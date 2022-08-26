"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {
    // const duplicateCheck = await db.query(
    //   `SELECT title, salary, equity, company_handle
    //        FROM jobs
    //        WHERE title=$1 AND salary=$2 AND equity=$3 AND company_handle=$4`,
    //   [title, salary, equity, companyHandle]);

    // if (duplicateCheck.rows[0])
    //   throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

    const result = await db.query(
      `INSERT INTO jobs(
          title,
          salary,
          equity,
          company_handle)
           VALUES
             ($1, $2, $3, $4)
           RETURNING title, salary, equity, company_handle AS "companyHandle"`,
      [
        title,
        salary,
        equity,
        companyHandle
      ],
    );
    const job = result.rows[0];

    return job;
  }

  /**
   * Accepts an object with data to filter selection in database
   * returns js object with string of where for WHERE clause
   * and values to filter by
   *  {title: 'hi', minSalary: 20, hasEquity: true } =>
      {where: 'title ILIKE $1 AND salary > $2 AND equity > 0',
      values: [hi, 20]}
   */
  static _sqlForFiltering(dataToFilter) {

    const { title, minSalary, hasEquity } = dataToFilter;
    let where = [];
    let values = [];

    if(title) {
      values.push(`%${title}%`);
      where.push(`title ILIKE $${values.length}`);
    }

    if(minSalary) {
      values.push(minSalary);
      where.push(`salary >= $${values.length}`);
    }

    if(hasEquity) {
      where.push(`equity > 0`);
    }

    where = where.length > 0 ?
            'WHERE ' + where.join(" AND ")
            : '';

    return {
      where,
      values
    };
  }

  /** Find all jobs.
   *  Has option to filter by title or minimum salary or equity
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */

  static async findAll(data) {

    const { where, values } = this._sqlForFiltering(data);

    const jobRes = await db.query(
      `SELECT title,
              salary,
              equity,
              company_handle AS "companyHandle"
           FROM jobs
           ${where}
           ORDER BY company_handle`, values);
    return jobRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { title, salary, equity, companyHandle }
   *   where jobs is [{ title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT title,
              salary,
              equity,
              company_handle as "companyHandle"
           FROM jobs
           WHERE id = $1`,
      [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE jobs
      SET ${setCols}
        WHERE id = ${idVarIdx}
        RETURNING title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
      [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
