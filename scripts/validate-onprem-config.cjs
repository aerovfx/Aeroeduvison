'use strict';

const secret = process.env.JWT_SECRET || '';
const errors = [];
if (secret.length < 32 || secret.includes('CHANGE_ME')) errors.push('JWT_SECRET phải là chuỗi ngẫu nhiên ít nhất 32 ký tự');
if (!/^https?:\/\//.test(process.env.PUBLIC_URL || '')) errors.push('PUBLIC_URL phải bắt đầu bằng http:// hoặc https://');
if (process.env.DEPLOYMENT_MODE !== 'on-premise') errors.push('DEPLOYMENT_MODE phải là on-premise');
if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log('On-premise configuration: OK');
