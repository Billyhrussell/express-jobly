"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /**
   * Accepts an object with data to filter selection in database
   * returns js object with string of setCols for WHERE clause
   * and values to filter by
   *  {name: 'hi', minEmployees: 20, maxEmployees: 50} =>
      {setCols: 'name ILIKE $1 AND num_employees>$2 AND num_employees < $3',
      values: [hi, 20, 50]}
   */
  static _sqlForFiltering(dataToFilter) {

    // {name: 'hi', minEmployees: 20, maxEmployees: 50} =>
    // ['"name" ILIKE $1 AND "num_employees">$2 AND num_employees < $3']
    //TODO:  use array
    const {name , minEmployees, maxEmployees } = dataToFilter;

    let where = "WHERE ";
    let idx = 1;

    if(!name && !minEmployees && !maxEmployees){
      where = "";
    }

    if(name){
      where += `name ILIKE $${idx}`;
      idx++;
    }
    if(minEmployees){
      if(idx > 1){
        where += " AND ";
      }
      where += `num_employees >= $${idx}`;
      idx++;
    }
    if(maxEmployees){
      if(idx > 1){
        where += " AND ";
      }
      where += `num_employees <= $${idx}`;
    }

    if (dataToFilter.name) {
      dataToFilter.name = '%'.concat(dataToFilter.name, '%');
    }

    return {
      where: where,
      values: Object.values(dataToFilter)
    };
  }
  /** Find all companies.
   *  Has option to filter by name or number of employees
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(data) {

    const { where, values } = this._sqlForFiltering(data);

    const companiesRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ${where}
           ORDER BY name`, values);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
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

    const jobsRes = await db.query(`
      SELECT id, title, salary, equity
      FROM jobs
      WHERE company_handle = $1`, [handle]
    )

    const jobs = jobsRes.rows;

    return { ...company, jobs };
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
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

  /** Delete given company from database; returns undefined.
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


module.exports = Company;
