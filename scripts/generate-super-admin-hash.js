const argon2 = require('argon2');
// 这个脚本的作用是生成一个超级管理员用户的密码 hash，并输出一段 SQL，可以直接复制到数据库里执行，创建一个新的超级管理员用户。

// 因为使用了argon2库，所以不能直接插入明文密码到数据库里，而是要先生成一个 hash，然后把这个 hash 插入到数据库里。

// 这里放要设置的超级管理员明文密码。
// 运行后会只在控制台打印 hash。
const username = ''; // ！！！这里设置超级管理员的用户名
const password = ''; // ！！！这里设置超级管理员的明文密码

async function main() {
  const hash = await argon2.hash(password);

  console.log('password_hash:', hash);
  console.log('');
  console.log('-- 下面这段 SQL 可以直接复制到数据库里执行');
  console.log('START TRANSACTION;');
  console.log(
    `INSERT INTO user (username, password, created_at, updated_at)
VALUES ('${username}', '${hash}', NOW(), NOW());`,
  );
  console.log('SET @new_user_id = LAST_INSERT_ID();');
  console.log(
    'INSERT INTO user_roles (userId, rolesId) VALUES (@new_user_id, 1);',
  );
  console.log('COMMIT;');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
