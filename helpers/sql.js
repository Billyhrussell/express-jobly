const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.
/**
 * Accept an object with data to be updated in database,
 * jsToSql turns js object data into SQL syntax to sanitize data.
 * Returns js object with key of setCols and values.
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

function sqlForFiltering(dataToFilter) {
  const keys = Object.keys(dataToFilter);
  if (keys.length === 0) throw new BadRequestError("No data");

  const jsToSql = { name: "name ILIKE ",
                    minEmployees: "num_employees >=",
                    maxEmployees: "num_employees <=" };

  // {name: 'hi', minEmployees: 20, maxEmployees: 50} =>
  // ['"name" ILIKE $1 AND "num_employees">$2 AND num_employees < $3']
  const cols = keys.map((colName, idx) =>
      `${jsToSql[colName] || colName}$${idx + 1}`,
  );

  if (dataToFilter.name) {
    dataToFilter.name = '%'.concat(dataToFilter.name,'%');
  }

  return {
    setCols: cols.join(" AND "),
    values: Object.values(dataToFilter)
  };
}

module.exports = { sqlForPartialUpdate,
                   sqlForFiltering };
