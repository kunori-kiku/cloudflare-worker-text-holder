export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ip = request.headers.get('cf-connecting-ip');
    const method = url.pathname.slice(1);
    const params = Object.fromEntries(url.searchParams);

    // Predefined constants
    const {
      GITHUB_TOKEN,
      GITHUB_USERNAME,
      REPO_NAME,
      DIRECTORY_PATH,
      BRANCH,
      FAIL_LIMIT,
      BAN_TIME,
      SUPER_TOKEN
    } = env;

    // Helper functions
    function sanitize(input) {
      return input.replace(/[^a-zA-Z0-9_-]/g, '');
    }

    async function isBanned(listName) {
      const record = await env.KV.get(listName + ip, { type: 'json' });
      if (!record) return false;

      const { lastFailedTime, failureCount } = record;
      const now = Date.now();

      if (failureCount >= FAIL_LIMIT) {
        if (now - lastFailedTime < BAN_TIME) {
          return true;
        } else {
          await env.KV.put(listName + ip, JSON.stringify({ lastFailedTime: now, failureCount: 0 }));
        }
      }
      return false;
    }

    async function addFailure(listName) {
      const record = await env.KV.get(listName + ip, { type: 'json' }) || { lastFailedTime: Date.now(), failureCount: 0 };
      record.lastFailedTime = Date.now();
      record.failureCount += 1;
      await env.KV.put(listName + ip, JSON.stringify(record));
    } free

    async function checkSuperAuth() {
      if (await isBanned('superFail-')) return new Response('', { status: 403 });
      if (params.superToken !== SUPER_TOKEN) {
        await addFailure('superFail-');
        return new Response('', { status: 403 });
      }
    }

    // Normal user requests
    if (method === 'get') {
      if (await isBanned('loginFail-')) return new Response('', { status: 403 });

      const { username, password } = params;
      const sanitizedUsername = sanitize(username);
      const sanitizedPassword = sanitize(password);

      const userList = JSON.parse(await env.KV.get('userList', { type: 'text' }) || '{}');

      if (!userList[sanitizedUsername] || userList[sanitizedUsername] !== sanitizedPassword) {
        await addFailure('loginFail-');
        return new Response('Bad logon', { status: 403 });
      }

      const fileResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${DIRECTORY_PATH}/${sanitizedUsername}.txt?ref=${BRANCH}`,
        { 
          headers: { 
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.raw',
            'User-Agent': 'CloudflareWorker/1.0'
          } 
        }
      );

      if (!fileResponse.ok) {
        const errorText = await fileResponse.text();
        return new Response(`File not found. GitHub API response: ${errorText}`, { status: 404 });
      }

      const fileContent = await fileResponse.text();
      return new Response(fileContent, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Super user requests
    const superAuthError = await checkSuperAuth();
    if (superAuthError) return superAuthError;

    const userList = JSON.parse(await env.KV.get('userList', { type: 'text' }) || '{}');

    switch (method) {
      case 'addUser':
        const sanitizedAddUsername = sanitize(params.username);
        const sanitizedAddPassword = sanitize(params.password);
        userList[sanitizedAddUsername] = sanitizedAddPassword;
        await env.KV.put('userList', JSON.stringify(userList));
        return new Response('User added', { status: 200 });

      case 'listUser':
        return new Response(JSON.stringify(Object.keys(userList)), { headers: { 'Content-Type': 'application/json' } });

      case 'removeUser':
        const sanitizedRemoveUsername = sanitize(params.username);
        delete userList[sanitizedRemoveUsername];
        await env.KV.put('userList', JSON.stringify(userList));
        return new Response('User removed', { status: 200 });

      case 'listFailIP':
        const failIPs = await env.KV.list({ prefix: 'loginFail-' });
        const failData = await Promise.all(
          failIPs.keys.map(async key => ({
            ip: key.name.replace('loginFail-', ''),
            data: JSON.parse(await env.KV.get(key.name, { type: 'json' }))
          }))
        );
        return new Response(JSON.stringify(failData), { headers: { 'Content-Type': 'application/json' } });

      case 'clearFailIP':
        const keysToDelete = await env.KV.list({ prefix: 'loginFail-' });
        await Promise.all(keysToDelete.keys.map(key => env.KV.delete(key.name)));
        return new Response('Cleared failed IP list', { status: 200 });

      default:
        return new Response('Method not supported', { status: 400 });
    }
  },
};
