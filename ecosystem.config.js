module.exports = {
    apps : [{
        name: "Xreacher-API",
        script: "/root/apps/Xreacher/backend-api/index.js",
        instances: "max",
        exec_mode: "cluster",
        watch: false,
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
}