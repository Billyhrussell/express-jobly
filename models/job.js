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
   * TODO: Throws BadRequestError if job already in database? Can have multiple openings for same job?
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const duplicateCheck = await db.query(
      `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title=$1 AND salary=$2 AND equity=$3 AND company_handle=$4`,
      [title, salary, equity, companyHandle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate job: ${title} at ${companyHandle}`);

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
      {where: 'title ILIKE $1 AND min_salary > $2 AND hasEquity = $3',
      values: [hi, 20, true]}
   */
  static _sqlForFiltering(dataToFilter) {

    const { title, minSalary, hasEquity } = dataToFilter;

    let where = [];

    if(title) {
      where.push(`title ILIKE $${where.length + 1}`);
      dataToFilter.title = '%'.concat(dataToFilter.title, '%');
    }

    if(minSalary) where.push(`salary >= $${where.length + 1}`);

    let values = Object.values(dataToFilter);

    if(hasEquity) {
      where.push(`equity > 0`);
      values.pop();
    }

    where = where.length > 0 ? 'WHERE '.concat(where.join(" AND ")) : '';

    return {
      where,
      values
    };
  }

  /** Find all job.
   *  Has option to filter by title or minimum salary or equity
   * Returns [{ title, salary, equity, companyHandle }, ...]
   * */ //FIXME: _sqlForFiltering

  static async findAll(data) {

    const { where, values } = this._sqlForFiltering(data);

    const companiesRes = await db.query(
      `SELECT title,
              salary,
              equity,
              company_handle AS companyHandle
           FROM jobs
           ${where}
           ORDER BY title`, values);
    return companiesRes.rows;
  }

  /** Given a job id, return data about job.
   *
   * Returns { title, salary, equity, companyHandle }
   *   where jobs is [{ title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
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

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Job;
