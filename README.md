# Cloudflare Worker for GitHub File Access

This Cloudflare Worker provides secure access to files in a private GitHub repository using predefined user credentials and super admin operations.

## Features

- **Normal User Operations**:
  - Fetch a text file by username.
  - Banned IP mechanism for repeated login failures.

- **Super Admin Operations**:
  - Add, list, and remove users.
  - List or clear IPs with failed login attempts.

## Environment Variables

Set the following variables in your Cloudflare Worker:

| Variable          | Description                                                                 |
|-------------------|-----------------------------------------------------------------------------|
| `GITHUB_TOKEN`    | GitHub fine-grained token with repository access.                          |
| `GITHUB_USERNAME` | GitHub username of the repository owner.                                   |
| `REPO_NAME`       | Name of the GitHub repository.                                             |
| `DIRECTORY_PATH`  | Directory path within the repository to fetch files from.                  |
| `BRANCH`          | Branch name of the repository (e.g., `main` or `master`).                  |
| `FAIL_LIMIT`      | Number of allowed failures before an IP is banned.                         |
| `BAN_TIME`        | Duration (in milliseconds) for which a banned IP remains banned.           |
| `SUPER_TOKEN`     | Secret token for performing super admin operations.                        |

## KV Namespace Setup

### Wrangler Setup

Create and bind KV namespaces for storing user data and failed login attempts:

1. Create namespaces:

   ```bash
   wrangler kv:namespace create "USER_DATA"
   wrangler kv:namespace create "FAILED_LOGINS"
   ```

2. Bind namespaces in `wrangler.toml`:

   ```toml
   kv_namespaces = [
     { binding = "KV", id = "<namespace-id>" }
   ]
   ```

### GUI Manual Setup

1. Login to your CloudFlare Dashboard
2. Click `Storage & Databases - KV - Create`, and insert a preferred name
3. Click `Workers and Pages` back to your created worker

## Endpoints

### Normal User Requests

#### Fetch File

`GET /get?username=XXX&password=XXX`

- Fetches a text file corresponding to the username (e.g., `username.txt`).
- **Response**:
  - `200`: File content as plain text.
  - `403`: Incorrect credentials.
  - `404`: File not found.

### Super Admin Requests

All requests require a valid `superToken`.

#### Add User

`GET /addUser?superToken=XXX&username=YYY&password=ZZZ`

- Adds a new user with the specified credentials.

#### List Users

`GET /listUser?superToken=XXX`

- Returns a list of all usernames.

#### Remove User

`GET /removeUser?superToken=XXX&username=YYY`

- Removes the specified user.

#### List Failed IPs

`GET /listFailIP?superToken=XXX`

- Lists IP addresses with failed login attempts.

#### Clear Failed IPs

`GET /clearFailIP?superToken=XXX`

- Clears the list of failed IPs.

## Example Usage

### Fetching a File

```bash
curl -X GET "https://worker-domain/get?username=johndoe&password=securepassword"
```

### Adding a User

```bash
curl -X GET "https://worker-domain/addUser?superToken=secret&username=johndoe&password=securepassword"
```

### Listing Users

```bash
curl -X GET "https://worker-domain/listUser?superToken=secret"
```

## Error Handling

- **IP Ban**: Banned IPs receive a `403` response.
- **GitHub Errors**: Returns GitHub API error messages for debugging.

## Deployment

### Wrangler Deployment

1. Configure environment variables in `wrangler.toml`.
2. Deploy the worker using Wrangler CLI:

   ```bash
   wrangler publish
   ```

### GUI Deployment

1. Log in to your Cloudflare dashboard.
2. Navigate to the Workers section and create a new Worker.
3. Copy the Worker script into the editor.
4. Set the required environment variables and bind [KV namespaces](##KV-Namespace-Setup)
5. Save and deploy the Worker.
